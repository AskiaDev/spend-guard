"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Mic, PauseCircle, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form-fields";
import { purchaseInputSchema } from "@/lib/schemas/finance";
import { extractPurchaseFromTranscript } from "@/lib/voice/parsers";
import { formatCurrency } from "@/lib/utils";
import type {
  FinancialSnapshot,
  PurchaseCheck,
  PurchaseDecisionResult,
  PurchaseInput,
  PaymentMethod,
  VoicePurchaseDraft,
} from "@/types/finance";
import type { z } from "zod";

interface PurchaseCheckerPanelProps {
  snapshot: FinancialSnapshot;
  latestCheck?: PurchaseCheck;
  onRunCheck: (purchase: PurchaseInput) => Promise<{
    check: PurchaseCheck;
    result: PurchaseDecisionResult;
  }>;
  onAddGoal: (check: PurchaseCheck) => Promise<unknown>;
  onAddCooldown: (check: PurchaseCheck) => Promise<unknown>;
}

const decisionTone = {
  SAFE_TO_BUY: "green",
  BUY_WITH_CAUTION: "amber",
  WAIT: "amber",
  NOT_RECOMMENDED: "red",
} as const;

type PurchaseFormInput = z.input<typeof purchaseInputSchema>;
type PurchaseFormOutput = z.output<typeof purchaseInputSchema>;

export function PurchaseCheckerPanel({
  snapshot,
  latestCheck,
  onRunCheck,
  onAddGoal,
  onAddCooldown,
}: PurchaseCheckerPanelProps) {
  const [activeCheck, setActiveCheck] = useState<PurchaseCheck | undefined>(latestCheck);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceDraft, setVoiceDraft] = useState<VoicePurchaseDraft | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const currency = snapshot.profile.currency;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseFormInput, unknown, PurchaseFormOutput>({
    resolver: zodResolver(purchaseInputSchema),
    defaultValues: {
      itemName: "",
      amount: 0,
      urgency: "want",
      paymentMethod: "cash",
      installmentMonths: undefined,
      monthlyPayment: undefined,
    },
  });
  const paymentMethodField = register("paymentMethod");

  const submit = handleSubmit(async (values) => {
    const result = await onRunCheck(values);
    setActiveCheck(result.check);
  });

  const supportsSpeech = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    []
  );

  function parseVoiceDraft() {
    const draft = extractPurchaseFromTranscript(voiceTranscript);
    setVoiceDraft(draft);
    setVoiceMessage("Review the extracted fields before analysis.");
  }

  function confirmVoiceDraft() {
    if (!voiceDraft) {
      return;
    }

    if (voiceDraft.itemName) setValue("itemName", voiceDraft.itemName);
    if (voiceDraft.amount) setValue("amount", voiceDraft.amount);
    if (voiceDraft.urgency) setValue("urgency", voiceDraft.urgency);
    if (voiceDraft.paymentMethod) {
      setValue("paymentMethod", voiceDraft.paymentMethod);
      setPaymentMethod(voiceDraft.paymentMethod);
    }
    if (voiceDraft.installmentMonths) setValue("installmentMonths", voiceDraft.installmentMonths);
    if (voiceDraft.monthlyPayment) setValue("monthlyPayment", voiceDraft.monthlyPayment);
    setVoiceMessage("Fields copied to the purchase form.");
  }

  function startVoiceCapture() {
    if (!supportsSpeech) {
      setVoiceMessage("Voice capture is unavailable in this browser.");
      return;
    }

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceMessage("Voice capture is unavailable in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-PH";
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      setVoiceMessage("Voice capture stopped. You can type the transcript instead.");
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");
      setVoiceTranscript(text);
      setVoiceDraft(extractPurchaseFromTranscript(text));
      setVoiceMessage("Transcript captured. Review before analysis.");
    };
    recognition.start();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Can I Buy This?</CardTitle>
              <p className="mt-1 text-sm text-zinc-600">
                Deterministic affordability check with optional advisory wording.
              </p>
            </div>
            <Badge tone="zinc">local analysis</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="itemName">Purchase</Label>
              <Input id="itemName" placeholder="Phone, laptop, trip" {...register("itemName")} />
              <FieldError>{errors.itemName?.message}</FieldError>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" min="0" {...register("amount")} />
                <FieldError>{errors.amount?.message}</FieldError>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="urgency">Urgency</Label>
                <Select id="urgency" {...register("urgency")}>
                  <option value="need_now">Need now</option>
                  <option value="need_this_month">Need this month</option>
                  <option value="can_wait">Can wait</option>
                  <option value="want">Want</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment</Label>
                <Select
                  id="paymentMethod"
                  {...paymentMethodField}
                  onChange={(event) => {
                    void paymentMethodField.onChange(event);
                    setPaymentMethod(event.target.value as PaymentMethod);
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="installment">Installment</option>
                  <option value="credit_card">Credit card</option>
                  <option value="loan">Loan</option>
                  <option value="bnpl">BNPL</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="installmentMonths">Months</Label>
                <Input
                  id="installmentMonths"
                  type="number"
                  min="1"
                  disabled={paymentMethod === "cash" || paymentMethod === "credit_card"}
                  {...register("installmentMonths")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="monthlyPayment">Monthly payment</Label>
                <Input
                  id="monthlyPayment"
                  type="number"
                  min="0"
                  disabled={paymentMethod === "cash" || paymentMethod === "credit_card"}
                  {...register("monthlyPayment")}
                />
                <FieldError>{errors.monthlyPayment?.message}</FieldError>
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <Sparkles className="size-4" aria-hidden="true" />
              Check purchase
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Check</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={startVoiceCapture}>
              <Mic className="size-4" aria-hidden="true" />
              {isRecording ? "Listening" : "Record"}
            </Button>
            <Button type="button" variant="ghost" onClick={parseVoiceDraft}>
              Parse transcript
            </Button>
          </div>
          <Textarea
            aria-label="Voice transcript"
            placeholder="Can I buy a phone for 25k on installment, 12 months at 2500 per month?"
            value={voiceTranscript}
            onChange={(event) => setVoiceTranscript(event.target.value)}
          />
          {voiceMessage ? <p className="text-sm text-zinc-600">{voiceMessage}</p> : null}
          {voiceDraft ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <div className="grid gap-2">
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-600">Item</span>
                  <span className="font-medium text-zinc-950">{voiceDraft.itemName ?? "Unknown"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-600">Amount</span>
                  <span className="font-medium text-zinc-950">
                    {voiceDraft.amount ? formatCurrency(voiceDraft.amount, currency) : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-600">Payment</span>
                  <span className="font-medium text-zinc-950">{voiceDraft.paymentMethod}</span>
                </div>
              </div>
              <Button type="button" className="mt-4 w-full" onClick={confirmVoiceDraft}>
                Confirm fields
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Latest Decision</CardTitle>
        </CardHeader>
        <CardContent>
          {activeCheck ? (
            <div className="grid gap-5 lg:grid-cols-[0.7fr_1fr]">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-5">
                <Badge tone={decisionTone[activeCheck.decision]}>
                  {activeCheck.decision.replaceAll("_", " ").toLowerCase()}
                </Badge>
                <h3 className="mt-4 text-3xl font-semibold text-zinc-950">
                  {formatCurrency(activeCheck.amount, currency)}
                </h3>
                <p className="mt-1 text-sm text-zinc-600">{activeCheck.itemName}</p>
                <div className="mt-4 grid gap-2 text-sm">
                  <p>Safe to spend: {formatCurrency(activeCheck.safeToSpend, currency)}</p>
                  <p>
                    Monthly free cash:{" "}
                    {formatCurrency(activeCheck.monthlyFreeCashFlow, currency)}
                  </p>
                  <p>Cooldown: {activeCheck.cooldownDays} days</p>
                </div>
              </div>
              <div className="grid content-between gap-5">
                <div>
                  <p className="text-base leading-7 text-zinc-700">{activeCheck.advisorText}</p>
                  <ul className="mt-4 grid gap-2 text-sm text-zinc-600">
                    {activeCheck.reasons.map((reason) => (
                      <li key={reason} className="rounded-md border border-zinc-200 bg-white p-3">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => onAddGoal(activeCheck)}>
                    <Target className="size-4" aria-hidden="true" />
                    Convert to goal
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onAddCooldown(activeCheck)}
                  >
                    <PauseCircle className="size-4" aria-hidden="true" />
                    Add cooldown
                  </Button>
                  <Button type="button" variant="ghost">
                    <CalendarPlus className="size-4" aria-hidden="true" />
                    Recheck later
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-zinc-300 p-5 text-sm text-zinc-600">
              Run a purchase check to see the recommendation, reasons, and next actions.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
