"use client";

import { AlertTriangle, Mic, RotateCcw, ShieldCheck, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { purchaseInputSchema } from "@/lib/schemas/finance";
import { formatCurrency } from "@/lib/utils";
import { extractPurchaseFromTranscript } from "@/lib/voice/parsers";
import { extractPurchaseWithModel } from "@/lib/voice/extract-with-model";
import type { ExtractedPurchase } from "@/lib/voice/draft-schema";
import type {
  PaymentMethod,
  PurchaseInput,
  PurchaseUrgency,
  VoicePurchaseDraft,
} from "@/types/finance";

type VoiceStage = "ready" | "listening" | "transcript" | "review";

interface VoicePurchaseCheckerProps {
  onRunCheck: (purchase: PurchaseInput) => Promise<unknown>;
  onSaveVoiceSession?: (draft: VoicePurchaseDraft) => Promise<void>;
}

interface ReviewDraft {
  itemName: string;
  amount: string;
  downPayment: string;
  installmentMonths: string;
  monthlyPayment: string;
  paymentMethod: PaymentMethod;
  urgency: PurchaseUrgency;
}

const emptyReviewDraft: ReviewDraft = {
  itemName: "",
  amount: "",
  downPayment: "",
  installmentMonths: "",
  monthlyPayment: "",
  paymentMethod: "cash",
  urgency: "want",
};

const financedPaymentMethods: PaymentMethod[] = ["installment", "loan", "bnpl"];
const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  installment: "Installment",
  credit_card: "Credit card",
  loan: "Loan",
  bnpl: "Buy now, pay later",
};
const analysisFailureMessage =
  "We couldn’t analyze this purchase yet. Your reviewed details are still here—please try again.";
// Capture stays open across natural pauses; we only force-stop after this much silence.
const IDLE_TIMEOUT_MS = 15_000;

function parseSpokenNumber(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  const multiplier = normalized.endsWith("k") ? 1000 : 1;
  const amount = Number(normalized.replace(/k$/, "").replace(/,/g, "")) * multiplier;

  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : undefined;
}

function extractDownPayment(transcript: string) {
  const match = transcript.match(
    /(?:₱|php|peso(?:s)?)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.\d+)?\s*k)\s*(?:as\s+)?(?:a\s+)?down payment/i
  );

  return match?.[1] ? parseSpokenNumber(match[1]) : undefined;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function detachRecognition(recognition: SpeechRecognition) {
  recognition.onstart = null;
  recognition.onend = null;
  recognition.onerror = null;
  recognition.onresult = null;
}

function releaseRecognition(
  recognitionRef: React.MutableRefObject<SpeechRecognition | null>,
  method: "abort"
) {
  const recognition = recognitionRef.current;

  if (!recognition) {
    return;
  }

  recognitionRef.current = null;
  detachRecognition(recognition);
  recognition[method]();
}

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (timerRef.current === null) {
    return;
  }

  clearInterval(timerRef.current);
  timerRef.current = null;
}

function clearIdleTimer(idleRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (idleRef.current === null) {
    return;
  }

  clearTimeout(idleRef.current);
  idleRef.current = null;
}

function buildReviewDraft(transcript: string): ReviewDraft {
  const extracted = extractPurchaseFromTranscript(transcript);

  return {
    itemName: extracted.itemName ?? "",
    amount: extracted.amount ? String(extracted.amount) : "",
    downPayment: String(extractDownPayment(transcript) ?? ""),
    installmentMonths: extracted.installmentMonths
      ? String(extracted.installmentMonths)
      : "",
    monthlyPayment: extracted.monthlyPayment ? String(extracted.monthlyPayment) : "",
    paymentMethod: extracted.paymentMethod ?? "cash",
    urgency: extracted.urgency ?? "want",
  };
}

// Prefer the model's structured fields, keeping each regex value as the fallback
// when the model leaves a field null. Same string-form ReviewDraft either way.
function mergeModelDraft(regex: ReviewDraft, model: ExtractedPurchase): ReviewDraft {
  const numberOr = (value: number | null, fallback: string) =>
    value != null ? String(value) : fallback;

  return {
    itemName: model.itemName.trim() || regex.itemName,
    amount: numberOr(model.amount, regex.amount),
    downPayment: numberOr(model.downPayment, regex.downPayment),
    installmentMonths: numberOr(model.installmentMonths, regex.installmentMonths),
    monthlyPayment: numberOr(model.monthlyPayment, regex.monthlyPayment),
    paymentMethod: model.paymentMethod || regex.paymentMethod,
    urgency: model.urgency || regex.urgency,
  };
}

function buildPurchaseCandidate(draft: ReviewDraft) {
  const purchase: Record<string, unknown> = {
    itemName: draft.itemName.trim(),
    amount: draft.amount,
    urgency: draft.urgency,
    paymentMethod: draft.paymentMethod,
  };

  if (financedPaymentMethods.includes(draft.paymentMethod)) {
    purchase.downPayment = draft.downPayment;
    purchase.installmentMonths = draft.installmentMonths;
    purchase.monthlyPayment = draft.monthlyPayment;
  }

  return purchase;
}

export function VoicePurchaseChecker({ onRunCheck, onSaveVoiceSession }: VoicePurchaseCheckerProps) {
  const router = useRouter();
  const [stage, setStage] = useState<VoiceStage>("ready");
  const [transcript, setTranscript] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(emptyReviewDraft);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const mountedRef = useRef(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldListenRef = useRef(false);
  const transcriptRef = useRef("");
  const userEditedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      shouldListenRef.current = false;
      clearTimer(timerRef);
      clearIdleTimer(idleTimerRef);
      releaseRecognition(recognitionRef, "abort");
    };
  }, []);

  function updateTranscript(value: string) {
    transcriptRef.current = value;
    setTranscript(value);
  }

  function armIdleTimer() {
    clearIdleTimer(idleTimerRef);
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      stopForIdle();
    }, IDLE_TIMEOUT_MS);
  }

  function stopForIdle() {
    // The user stayed silent for the whole idle window — end capture for them.
    shouldListenRef.current = false;
    clearIdleTimer(idleTimerRef);
    setCaptureNotice(
      "We stopped listening after 15 seconds of silence. Start again whenever you’re ready."
    );

    const recognition = recognitionRef.current;

    if (recognition) {
      recognition.stop();
      return;
    }

    clearTimer(timerRef);
    setStage(transcriptRef.current.trim() ? "transcript" : "ready");
  }

  function beginTimer() {
    clearTimer(timerRef);
    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setElapsedSeconds((current) => current + 1);
      }
    }, 1000);
  }

  function startCapture() {
    setCaptureNotice(null);
    setAnalysisError(null);

    const SpeechRecognitionApi =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setCaptureNotice(
        "Voice capture isn’t available in this browser. You can type or paste your request instead."
      );
      return;
    }

    clearTimer(timerRef);
    clearIdleTimer(idleTimerRef);
    releaseRecognition(recognitionRef, "abort");

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-PH";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    recognition.onstart = () => {
      if (mountedRef.current && recognitionRef.current === recognition) {
        setStage("listening");
      }
    };
    recognition.onresult = (event) => {
      if (!mountedRef.current || recognitionRef.current !== recognition) {
        return;
      }

      const parts: string[] = [];

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index] ?? event.results.item(index);
        const value = result?.[0]?.transcript;

        if (value) {
          parts.push(value.trim());
        }
      }

      if (parts.length > 0) {
        updateTranscript(parts.join(" "));

        // Speech detected: reset the silence countdown.
        if (shouldListenRef.current) {
          armIdleTimer();
        }
      }
    };
    recognition.onerror = (event) => {
      if (!mountedRef.current || recognitionRef.current !== recognition) {
        return;
      }

      // `no-speech`/`aborted` fire on natural silence in continuous mode — leave the
      // session for onend to restart so a pause never ends capture early.
      const isBenign = event.error === "no-speech" || event.error === "aborted";

      if (isBenign && shouldListenRef.current) {
        return;
      }

      shouldListenRef.current = false;
      clearTimer(timerRef);
      clearIdleTimer(idleTimerRef);
      releaseRecognition(recognitionRef, "abort");
      setCaptureNotice(
        "We couldn’t continue voice capture. Your transcript is still here, and you can type or paste instead."
      );
      setStage(transcriptRef.current.trim() ? "transcript" : "ready");
    };
    recognition.onend = () => {
      if (!mountedRef.current || recognitionRef.current !== recognition) {
        return;
      }

      // The browser ends a session on each silence/segment. While the user still
      // intends to capture (Stop not pressed, idle window not elapsed), restart it.
      if (shouldListenRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // ponytail: restart can throw if the engine is gone — fall through and finalize.
        }
      }

      clearTimer(timerRef);
      clearIdleTimer(idleTimerRef);
      recognitionRef.current = null;
      detachRecognition(recognition);
      setStage(transcriptRef.current.trim() ? "transcript" : "ready");
    };

    setElapsedSeconds(0);
    setStage("listening");
    beginTimer();

    try {
      recognition.start();
      armIdleTimer();
    } catch {
      shouldListenRef.current = false;
      clearTimer(timerRef);
      clearIdleTimer(idleTimerRef);
      releaseRecognition(recognitionRef, "abort");
      setCaptureNotice(
        "We couldn’t start voice capture. You can still type or paste your request."
      );
      setStage("ready");
    }
  }

  function stopCapture() {
    shouldListenRef.current = false;
    clearTimer(timerRef);
    clearIdleTimer(idleTimerRef);

    const recognition = recognitionRef.current;

    if (!recognition) {
      setStage(transcriptRef.current.trim() ? "transcript" : "ready");
      return;
    }

    recognition.stop();
  }

  function reviewTranscript() {
    if (!transcript.trim()) {
      setCaptureNotice("Add a purchase request before reviewing the extracted details.");
      return;
    }

    shouldListenRef.current = false;
    clearTimer(timerRef);
    clearIdleTimer(idleTimerRef);
    releaseRecognition(recognitionRef, "abort");
    const regexDraft = buildReviewDraft(transcript);
    userEditedRef.current = false;
    setReviewDraft(regexDraft);
    setAnalysisError(null);
    setStage("review");
    void refineDraftWithModel(transcript, regexDraft);
  }

  async function refineDraftWithModel(source: string, regexDraft: ReviewDraft) {
    const extracted = await extractPurchaseWithModel(source);

    // Only upgrade if the model returned fields and the user hasn't started editing,
    // so the model never overwrites a value the user is correcting. Regex stays
    // otherwise — extraction is an enhancement, never a dependency.
    if (extracted && mountedRef.current && !userEditedRef.current) {
      setReviewDraft(mergeModelDraft(regexDraft, extracted));
    }
  }

  function resetCapture() {
    shouldListenRef.current = false;
    clearTimer(timerRef);
    clearIdleTimer(idleTimerRef);
    releaseRecognition(recognitionRef, "abort");
    updateTranscript("");
    setReviewDraft(emptyReviewDraft);
    userEditedRef.current = false;
    setElapsedSeconds(0);
    setCaptureNotice(null);
    setAnalysisError(null);
    setStage("ready");
  }

  function updateReviewField<Key extends keyof ReviewDraft>(key: Key, value: ReviewDraft[Key]) {
    userEditedRef.current = true;
    setReviewDraft((current) => ({ ...current, [key]: value }));
    setAnalysisError(null);
  }

  async function analyzePurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (stage !== "review") {
      return;
    }

    const parsed = purchaseInputSchema.safeParse(buildPurchaseCandidate(reviewDraft));

    if (!parsed.success) {
      setAnalysisError("Please review the product, price, and payment details before analysis.");
      return;
    }

    setAnalysisError(null);
    setIsAnalyzing(true);

    void onSaveVoiceSession?.({
      ...parsed.data,
      transcript,
      requiresConfirmation: true,
      confidence: 1,
    });

    try {
      await onRunCheck(parsed.data);

      if (mountedRef.current) {
        router.push("/checker/result");
      }
    } catch {
      if (mountedRef.current) {
        setAnalysisError(analysisFailureMessage);
      }
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }

  const showFinancingFields = financedPaymentMethods.includes(reviewDraft.paymentMethod);
  const reviewAmount = parseSpokenNumber(reviewDraft.amount);
  const reviewDownPayment = parseSpokenNumber(reviewDraft.downPayment);
  const reviewMonthlyPayment = parseSpokenNumber(reviewDraft.monthlyPayment);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card
        aria-label="Voice capture"
        className={stage === "review" ? "hidden lg:block" : undefined}
      >
        <CardHeader>
          <CardTitle>Voice capture</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {stage === "ready" ? (
            <section className="grid gap-4" aria-labelledby="voice-ready-title">
              <div>
                <h2 id="voice-ready-title" className="text-lg font-semibold text-foreground">
                  Tell us what you want to buy
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Include the price, payment plan, and how soon you need it. You can speak,
                  type, or paste your request.
                </p>
              </div>

              <p className="flex items-start gap-2 rounded-control border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  Your transcript may be sent to an AI service to read the purchase details, and
                  saved checks store it on your account. Delete saved transcripts anytime in
                  Settings.
                </span>
              </p>

              {captureNotice ? (
                <p
                  aria-live="polite"
                  className="rounded-control border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                  role="status"
                >
                  {captureNotice}
                </p>
              ) : null}

              <TranscriptEditor transcript={transcript} onChange={updateTranscript} />

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={startCapture}>
                  <Mic aria-hidden="true" className="size-4" />
                  Start voice capture
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!transcript.trim()}
                  onClick={reviewTranscript}
                >
                  Review extracted details
                </Button>
              </div>
            </section>
          ) : null}

          {stage === "listening" ? (
            <section className="grid gap-5 text-center" aria-labelledby="voice-listening-title">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
                <Mic aria-hidden="true" className="size-8" />
              </div>
              <div>
                <h2
                  id="voice-listening-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Listening
                </h2>
                <p className="mt-1 font-mono text-2xl font-semibold text-foreground">
                  {formatElapsed(elapsedSeconds)}
                </p>
              </div>
              <div
                aria-live="polite"
                className="min-h-24 rounded-control border border-border bg-muted/30 p-3 text-left text-sm text-foreground"
              >
                {transcript || "Your words will appear here as you speak."}
              </div>
              <Button type="button" variant="danger" onClick={stopCapture}>
                <Square aria-hidden="true" className="size-4" />
                Stop
              </Button>
            </section>
          ) : null}

          {stage === "transcript" ? (
            <section className="grid gap-4" aria-labelledby="voice-transcript-title">
              <div>
                <h2
                  id="voice-transcript-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Check the transcript
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Correct anything the microphone missed before extracting purchase details.
                </p>
              </div>
              <TranscriptEditor transcript={transcript} onChange={updateTranscript} />
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={reviewTranscript}>
                  Review extracted details
                </Button>
                <Button type="button" variant="secondary" onClick={resetCapture}>
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Record again
                </Button>
              </div>
            </section>
          ) : null}

          {stage === "review" ? (
            <section className="grid gap-4" aria-labelledby="voice-source-title">
              <div>
                <h2 id="voice-source-title" className="text-lg font-semibold text-foreground">
                  Source transcript
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep this source nearby while you review the extracted values.
                </p>
              </div>
              <p className="rounded-control border border-border bg-muted/30 p-3 text-sm text-foreground">
                {transcript}
              </p>
            </section>
          ) : null}
        </CardContent>
      </Card>

      <Card
        aria-label="Review workspace"
        className={stage === "review" ? undefined : "hidden lg:block"}
      >
        <CardHeader>
          <CardTitle>{stage === "review" ? "Review extracted details" : "Review workspace"}</CardTitle>
        </CardHeader>
        <CardContent>
          {stage !== "review" ? (
            <div className="grid min-h-64 place-items-center text-center">
              <div className="max-w-sm">
                <Mic aria-hidden="true" className="mx-auto size-8 text-primary" />
                <p className="mt-3 font-semibold text-foreground">Capture first, decide second</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Extracted values appear here for confirmation before SpendGuard runs a check.
                </p>
              </div>
            </div>
          ) : (
            <form className="grid gap-5" onSubmit={analyzePurchase} noValidate>
              <section
                aria-label="Purchase details to review"
                className="grid gap-5"
                role="region"
              >
                <div className="rounded-control border border-caution/30 bg-caution/10 px-4 py-3 text-sm text-foreground">
                  <div className="flex gap-2">
                    <AlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-caution"
                    />
                    <p>
                      <span className="font-semibold">Review every value before analysis.</span>{" "}
                      Speech extraction can mishear products, prices, or payment terms.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ReviewValue
                    label="Price"
                    value={reviewAmount === undefined ? "Not found" : formatCurrency(reviewAmount)}
                  />
                  <ReviewValue
                    label="Payment"
                    value={paymentMethodLabels[reviewDraft.paymentMethod]}
                  />
                  {showFinancingFields ? (
                    <>
                      <ReviewValue
                        label="Down payment"
                        value={
                          reviewDownPayment === undefined
                            ? "Not found"
                            : formatCurrency(reviewDownPayment)
                        }
                      />
                      <ReviewValue
                        label="Monthly"
                        value={
                          reviewMonthlyPayment === undefined
                            ? "Not found"
                            : formatCurrency(reviewMonthlyPayment)
                        }
                      />
                      <ReviewValue
                        label="Term"
                        value={
                          reviewDraft.installmentMonths
                            ? `${reviewDraft.installmentMonths} months`
                            : "Not found"
                        }
                      />
                    </>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="voice-item-name">Product name</Label>
                    <Input
                      id="voice-item-name"
                      value={reviewDraft.itemName}
                      onChange={(event) => updateReviewField("itemName", event.target.value)}
                    />
                  </div>

                  <ReviewNumberField
                    id="voice-price"
                    label="Price"
                    value={reviewDraft.amount}
                    onChange={(value) => updateReviewField("amount", value)}
                  />

                  <div className="grid gap-2">
                    <Label htmlFor="voice-payment-method">Payment method</Label>
                    <Select
                      value={reviewDraft.paymentMethod}
                      onValueChange={(value) =>
                        updateReviewField("paymentMethod", value as PaymentMethod)
                      }
                    >
                      <SelectTrigger id="voice-payment-method" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="installment">Installment</SelectItem>
                        <SelectItem value="credit_card">Credit card</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="bnpl">Buy now, pay later</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="voice-urgency">Urgency</Label>
                    <Select
                      value={reviewDraft.urgency}
                      onValueChange={(value) =>
                        updateReviewField("urgency", value as PurchaseUrgency)
                      }
                    >
                      <SelectTrigger id="voice-urgency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="need_now">Need now</SelectItem>
                        <SelectItem value="need_this_month">Need this month</SelectItem>
                        <SelectItem value="can_wait">Can wait</SelectItem>
                        <SelectItem value="want">Want</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {showFinancingFields ? (
                    <>
                      <ReviewNumberField
                        id="voice-down-payment"
                        label="Down payment"
                        value={reviewDraft.downPayment}
                        onChange={(value) => updateReviewField("downPayment", value)}
                      />
                      <ReviewNumberField
                        id="voice-monthly-payment"
                        label="Monthly payment"
                        value={reviewDraft.monthlyPayment}
                        onChange={(value) => updateReviewField("monthlyPayment", value)}
                      />
                      <ReviewNumberField
                        id="voice-installment-months"
                        label="Term (months)"
                        min="1"
                        value={reviewDraft.installmentMonths}
                        onChange={(value) => updateReviewField("installmentMonths", value)}
                      />
                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        Down payment is included in the savings-after-purchase check for financed
                        purchases.
                      </p>
                    </>
                  ) : null}
                </div>

                {analysisError ? (
                  <p
                    className="rounded-control border border-risk/30 bg-risk/10 px-3 py-2 text-sm font-medium text-risk"
                    role="alert"
                  >
                    {analysisError}
                  </p>
                ) : null}
              </section>

              <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex flex-col-reverse gap-2 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end lg:static lg:p-0">
                <Button type="button" variant="secondary" onClick={resetCapture}>
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Record again
                </Button>
                <Button
                  type="submit"
                  disabled={isAnalyzing}
                  isLoading={isAnalyzing}
                  loadingText="Analyzing..."
                >
                  Analyze purchase
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TranscriptEditor({
  transcript,
  onChange,
}: {
  transcript: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="voice-transcript">Purchase transcript</Label>
      <Textarea
        id="voice-transcript"
        placeholder="Can I buy a phone for ₱25,000 on installment?"
        value={transcript}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ReviewNumberField({
  id,
  label,
  min = "0",
  value,
  onChange,
}: {
  id: string;
  label: string;
  min?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
