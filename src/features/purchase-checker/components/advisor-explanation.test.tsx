import { render, screen } from "@testing-library/react";
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
});

describe("LessonBlock", () => {
  it("renders one relevant educational lesson for the check", () => {
    render(<LessonBlock check={check} />);

    expect(screen.getByText("Lesson")).toBeInTheDocument();
    // debtPressure 0, cooldownDays 14 → the cooldown lesson is selected.
    expect(screen.getByText(/cooldown beats an impulse/i)).toBeInTheDocument();
  });
});
