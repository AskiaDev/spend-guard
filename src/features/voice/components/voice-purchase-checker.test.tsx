import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PurchaseInput } from "@/types/finance";
import { VoicePurchaseChecker } from "./voice-purchase-checker";

const pushSpy = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
}));

const suppliedTranscript =
  "Can I buy an iPhone Pro Max 1TB for ₱170,000 on installment with a ₱50,000 down payment, 24 months at ₱6,000 per month? I can wait.";

class MockSpeechRecognition extends EventTarget {
  lang = "";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

let recognition: MockSpeechRecognition;
let recognitionConstructor: ReturnType<typeof vi.fn>;

function installSpeechRecognition() {
  recognitionConstructor = vi.fn(function SpeechRecognitionMock() {
    recognition = new MockSpeechRecognition();
    return recognition;
  });

  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: recognitionConstructor,
  });
  Object.defineProperty(window, "webkitSpeechRecognition", {
    configurable: true,
    value: undefined,
  });
}

function removeSpeechRecognition() {
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window, "webkitSpeechRecognition", {
    configurable: true,
    value: undefined,
  });
}

function emitTranscript(value: string) {
  const speechResult = {
    0: { transcript: value },
    isFinal: true,
    length: 1,
  };
  const results = {
    0: speechResult,
    length: 1,
    item: () => speechResult,
  } as unknown as SpeechRecognitionResultList;

  act(() => {
    recognition.onresult?.({ results } as SpeechRecognitionEvent);
  });
}

function emitRecognitionEnd() {
  act(() => {
    recognition.onend?.();
  });
}

function emitRecognitionError(code: string) {
  act(() => {
    recognition.onerror?.({ error: code } as SpeechRecognitionErrorEvent);
  });
}

async function enterReview(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/purchase transcript/i), suppliedTranscript);
  await user.click(screen.getByRole("button", { name: /review extracted details/i }));
}

describe("VoicePurchaseChecker", () => {
  beforeEach(() => {
    pushSpy.mockClear();
    installSpeechRecognition();
  });

  afterEach(() => {
    vi.useRealTimers();
    removeSpeechRecognition();
  });

  it("renders ready guidance without constructing the Web Speech API during render", () => {
    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /tell us what you want to buy/i })).toBeVisible();
    expect(screen.getByText(/include the price, payment plan, and how soon you need it/i)).toBeVisible();
    expect(screen.getByLabelText(/purchase transcript/i)).toBeEnabled();
    expect(screen.getByRole("button", { name: /start voice capture/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /analyze purchase/i })).not.toBeInTheDocument();
    expect(recognitionConstructor).not.toHaveBeenCalled();
  });

  it("surfaces a voice privacy note before capture", () => {
    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);

    const note = screen.getByText(/your transcript may be sent to an AI service/i);
    expect(note).toBeVisible();
    expect(note).toHaveTextContent(/delete saved transcripts anytime in Settings/i);
  });

  it("uses non-blaming fallback copy and keeps typed transcript review usable when speech is unsupported", async () => {
    const user = userEvent.setup();
    removeSpeechRecognition();

    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /start voice capture/i }));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      /voice capture isn’t available in this browser.*type or paste your request instead/i
    );
    expect(screen.getByLabelText(/purchase transcript/i)).toBeEnabled();

    await enterReview(user);

    expect(screen.getByRole("heading", { name: /review extracted details/i })).toBeVisible();
    expect(screen.getByText(/review every value before analysis/i)).toBeVisible();
    expect(screen.getByText("₱170,000")).toBeVisible();
    expect(screen.getByText("₱50,000")).toBeVisible();
    expect(screen.getByText("₱6,000")).toBeVisible();
    expect(screen.getByText("24 months")).toBeVisible();
  });

  it("shows elapsed listening time, renders speech results, and releases recognition after Stop ends", () => {
    vi.useFakeTimers();

    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice capture/i }));

    expect(recognitionConstructor).toHaveBeenCalledOnce();
    expect(recognition.start).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: /listening/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^stop$/i })).toBeEnabled();
    expect(screen.getByText("0:00")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("0:02")).toBeVisible();

    emitTranscript(suppliedTranscript);
    expect(screen.getByText(suppliedTranscript)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /^stop$/i }));

    expect(recognition.stop).toHaveBeenCalledOnce();
    expect(recognition.onresult).toEqual(expect.any(Function));
    expect(recognition.onend).toEqual(expect.any(Function));

    emitRecognitionEnd();

    expect(recognition.onstart).toBeNull();
    expect(recognition.onend).toBeNull();
    expect(recognition.onerror).toBeNull();
    expect(recognition.onresult).toBeNull();
    expect(screen.getByRole("heading", { name: /check the transcript/i })).toBeVisible();
    expect(screen.getByLabelText(/purchase transcript/i)).toHaveValue(suppliedTranscript);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("0:04")).not.toBeInTheDocument();
  });

  it("preserves a final speech result delivered after the user clicks Stop", () => {
    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice capture/i }));
    fireEvent.click(screen.getByRole("button", { name: /^stop$/i }));

    expect(recognition.stop).toHaveBeenCalledOnce();
    expect(recognition.onresult).toEqual(expect.any(Function));

    emitTranscript(suppliedTranscript);
    emitRecognitionEnd();

    expect(screen.getByRole("heading", { name: /check the transcript/i })).toBeVisible();
    expect(screen.getByLabelText(/purchase transcript/i)).toHaveValue(suppliedTranscript);
  });

  it("listens continuously, restarts when the browser ends a segment, and force-stops after 15s of silence", () => {
    vi.useFakeTimers();

    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice capture/i }));

    // Continuous keeps the session alive across natural pauses.
    expect(recognition.continuous).toBe(true);
    expect(recognition.start).toHaveBeenCalledOnce();

    emitTranscript("Can I buy a phone");

    // Browser ends the segment after a short pause: restart instead of stopping.
    emitRecognitionEnd();
    expect(recognition.start).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: /listening/i })).toBeVisible();

    // 15 seconds with no further speech: force-stop into the transcript stage.
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(recognition.stop).toHaveBeenCalledOnce();

    emitRecognitionEnd();
    expect(screen.getByRole("heading", { name: /check the transcript/i })).toBeVisible();
    expect(screen.getByLabelText(/purchase transcript/i)).toHaveValue("Can I buy a phone");
  });

  it("resets the 15s idle timer whenever new speech arrives", () => {
    vi.useFakeTimers();

    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start voice capture/i }));

    emitTranscript("first");
    act(() => {
      vi.advanceTimersByTime(10000); // 10s of silence, still within the window
    });
    expect(recognition.stop).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /listening/i })).toBeVisible();

    emitTranscript("first and second"); // new speech resets the idle window
    act(() => {
      vi.advanceTimersByTime(10000); // 10s more, but only 10s since last speech
    });
    expect(recognition.stop).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000); // now a full 15s since the last speech
    });
    expect(recognition.stop).toHaveBeenCalledOnce();
  });

  it("ignores no-speech errors but stops with guidance on a fatal microphone error", () => {
    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start voice capture/i }));

    // A silent gap raises `no-speech`; the session keeps going.
    emitRecognitionError("no-speech");
    emitRecognitionEnd();
    expect(recognition.start).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: /listening/i })).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    // A real failure (e.g. denied mic permission) stops capture with non-blaming guidance.
    emitRecognitionError("not-allowed");
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(/couldn’t continue voice capture/i);
    expect(screen.getByRole("button", { name: /start voice capture/i })).toBeVisible();
  });

  it("extracts editable review fields and re-record clears transcript and draft values", async () => {
    const user = userEvent.setup();

    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);
    await enterReview(user);

    expect(screen.getByLabelText(/product name/i)).toHaveValue("iPhone Pro Max 1TB");
    expect(screen.getByLabelText(/^price$/i)).toHaveValue(170000);
    expect(screen.getByLabelText(/down payment/i)).toHaveValue(50000);
    expect(screen.getByLabelText(/monthly payment/i)).toHaveValue(6000);
    expect(screen.getByLabelText(/term.*months/i)).toHaveValue(24);
    expect(
      screen.getByText(/down payment is included in the savings-after-purchase check/i)
    ).toBeVisible();

    await user.clear(screen.getByLabelText(/product name/i));
    await user.type(screen.getByLabelText(/product name/i), "Edited phone");
    await user.clear(screen.getByLabelText(/down payment/i));
    await user.type(screen.getByLabelText(/down payment/i), "40000");

    expect(screen.getByLabelText(/product name/i)).toHaveValue("Edited phone");
    expect(screen.getByLabelText(/down payment/i)).toHaveValue(40000);

    await user.click(screen.getByRole("button", { name: /record again/i }));

    expect(screen.getByRole("heading", { name: /tell us what you want to buy/i })).toBeVisible();
    expect(screen.getByLabelText(/purchase transcript/i)).toHaveValue("");
    expect(screen.queryByDisplayValue("Edited phone")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("40000")).not.toBeInTheDocument();
  });

  it("shows Not found instead of ₱0 when numeric review fields are blank", async () => {
    const user = userEvent.setup();

    render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);
    await enterReview(user);

    await user.clear(screen.getByLabelText(/^price$/i));
    await user.clear(screen.getByLabelText(/down payment/i));
    await user.clear(screen.getByLabelText(/monthly payment/i));

    const review = screen.getByRole("region", { name: /purchase details to review/i });
    expect(within(review).getAllByText("Not found")).toHaveLength(3);
    expect(within(review).queryByText("₱0")).not.toBeInTheDocument();
  });

  it("maps reviewed PurchaseInput fields, awaits analysis, and then navigates to the result", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (value: unknown) => void = () => {};
    const analysis = new Promise((resolve) => {
      resolveAnalysis = resolve;
    });
    const onRunCheck = vi.fn<(purchase: PurchaseInput) => Promise<unknown>>(() => analysis);

    render(<VoicePurchaseChecker onRunCheck={onRunCheck} />);

    expect(screen.queryByRole("button", { name: /analyze purchase/i })).not.toBeInTheDocument();
    await enterReview(user);

    const review = screen.getByRole("region", { name: /purchase details to review/i });
    expect(within(review).getByText("₱170,000")).toBeVisible();
    expect(within(review).getByText("₱50,000")).toBeVisible();
    expect(within(review).getByText("₱6,000")).toBeVisible();
    expect(within(review).getByText("24 months")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "iPhone Pro Max 1TB",
      amount: 170000,
      urgency: "can_wait",
      paymentMethod: "installment",
      downPayment: 50000,
      installmentMonths: 24,
      monthlyPayment: 6000,
    });
    expect(pushSpy).not.toHaveBeenCalled();

    resolveAnalysis({});

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith("/checker/result"));
  });

  it("shows non-blaming analysis feedback and preserves edited review values for retry", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockRejectedValue(new Error("storage unavailable"));

    render(<VoicePurchaseChecker onRunCheck={onRunCheck} />);
    await enterReview(user);

    await user.clear(screen.getByLabelText(/product name/i));
    await user.type(screen.getByLabelText(/product name/i), "Edited iPhone");
    await user.clear(screen.getByLabelText(/monthly payment/i));
    await user.type(screen.getByLabelText(/monthly payment/i), "5500");
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn’t analyze this purchase yet. Your reviewed details are still here—please try again."
    );
    expect(screen.getByLabelText(/product name/i)).toHaveValue("Edited iPhone");
    expect(screen.getByLabelText(/monthly payment/i)).toHaveValue(5500);
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("aborts active recognition and detaches callbacks on unmount", () => {
    const { unmount } = render(<VoicePurchaseChecker onRunCheck={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start voice capture/i }));
    unmount();

    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(recognition.onstart).toBeNull();
    expect(recognition.onend).toBeNull();
    expect(recognition.onerror).toBeNull();
    expect(recognition.onresult).toBeNull();
  });
});
