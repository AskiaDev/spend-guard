import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ModelClient } from "@/lib/ai/types";
import type { PurchaseCheck } from "@/types/finance";

import { AdvisorExplanation, LessonBlock } from "./advisor-explanation";

function streamingClient(chunks: string[]): ModelClient {
  return {
    id: "cloud",
    isAvailable: async () => true,
    generateText: async () => chunks.join(""),
    async *streamText() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((next) => {
    resolve = next;
  });

  return { promise, resolve };
}

const check: PurchaseCheck = {
  id: "c1",
  createdAt: "2026-06-20T00:00:00.000Z",
  itemName: "Phone",
  amount: 25_000,
  urgency: "want",
  paymentMethod: "cash",
  decision: "WAIT",
  riskScore: 60,
  safeToSpend: 10_000,
  monthlyFreeCashFlow: 20_000,
  savingsAfterPurchase: 5_000,
  emergencyProgress: 0.4,
  debtPressure: 0,
  goalDelayMonths: 0,
  healthScore: 60,
  cooldownDays: 14,
  status: "checked",
  advisorText: "Deterministic advisor narrative.",
  reasons: ["The purchase exceeds safe-to-spend."],
};

describe("AdvisorExplanation", () => {
  it("renders the deterministic narrative, unlabelled, when not live", () => {
    render(<AdvisorExplanation check={check} live={false} />);

    expect(screen.getByText("Deterministic advisor narrative.")).toBeInTheDocument();
    expect(screen.queryByText(/AI explanation/i)).not.toBeInTheDocument();
  });

  it("carries an inline not-financial-advice disclaimer", () => {
    render(<AdvisorExplanation check={check} live={false} />);

    expect(screen.getByText("Not financial advice.")).toBeInTheDocument();
  });

  it("shows a contradictory model only as a labelled AI explanation, never as a verdict", async () => {
    const rogue = streamingClient(["Buy it now — you can clearly afford it!"]);
    render(
      <AdvisorExplanation check={{ ...check, decision: "NOT_RECOMMENDED" }} live clients={[rogue]} />
    );

    // The model's prose appears, explicitly labelled as AI...
    expect(await screen.findByText(/Buy it now/)).toBeInTheDocument();
    expect(screen.getByText(/AI explanation/i)).toBeInTheDocument();
    // ...and the component never renders a decision the model could have flipped.
    expect(screen.queryByText(/NOT_RECOMMENDED|SAFE_TO_BUY/)).not.toBeInTheDocument();
  });

  it("shows advisor preparation while keeping the saved fallback visible before the first token", async () => {
    const firstToken = deferred();
    const secondToken = deferred();
    const client: ModelClient = {
      id: "cloud",
      isAvailable: async () => true,
      generateText: async () => "AI explanation.",
      async *streamText() {
        await firstToken.promise;
        yield "AI ";
        await secondToken.promise;
        yield "explanation.";
      },
    };

    render(<AdvisorExplanation check={check} live clients={[client]} />);

    expect(await screen.findByRole("status")).toHaveTextContent(/preparing advisor/i);
    expect(screen.getByText("Deterministic advisor narrative.")).toBeVisible();

    act(() => firstToken.resolve());
    await waitFor(() =>
      expect(
        screen.getByText(
          (_, element) =>
            element?.getAttribute("aria-live") === "polite" &&
            element.textContent?.startsWith("AI") === true
        )
      ).toBeVisible()
    );
    expect(screen.getByText(/AI explanation/i)).toBeInTheDocument();
    expect(screen.getByText(/generating/i)).toBeInTheDocument();

    act(() => secondToken.resolve());
    await waitFor(() => expect(screen.getByText("AI explanation.")).toBeVisible());
  });

  it("keeps fallback text and shows a non-blocking notice when providers fail", async () => {
    const failing: ModelClient = {
      id: "cloud",
      isAvailable: async () => true,
      generateText: async () => "unused",
      async *streamText() {
        throw new Error("provider failed");
      },
    };

    render(<AdvisorExplanation check={check} live clients={[failing]} />);

    expect(await screen.findByText("Deterministic advisor narrative.")).toBeVisible();
    expect(await screen.findByText(/using the saved explanation/i)).toBeVisible();
    expect(screen.getByText("Deterministic advisor narrative.").textContent?.trim()).not.toBe("");
  });
});

describe("LessonBlock", () => {
  it("renders one relevant educational lesson for the check", () => {
    render(<LessonBlock check={check} />);

    expect(screen.getByText("Lesson")).toBeInTheDocument();
    // debtPressure 0, cooldownDays 14 → the cooldown lesson is selected.
    expect(screen.getByText(/cooldown beats an impulse/i)).toBeInTheDocument();
  });
});
