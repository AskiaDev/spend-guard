import { describe, expect, it } from "vitest";

import {
  extractPurchaseFromTranscript,
  parseInstallmentTerms,
  parsePesoAmount,
} from "./parsers";

describe("voice and money parsers", () => {
  it("parses peso amounts from common spoken and typed formats", () => {
    expect(parsePesoAmount("Can I buy a phone for ₱25,499?")).toBe(25499);
    expect(parsePesoAmount("laptop for 52k pesos")).toBe(52000);
    expect(parsePesoAmount("keyboard, around 1.5k")).toBe(1500);
  });

  it("returns null when a transcript has no peso-like amount", () => {
    expect(parsePesoAmount("Can I buy this soon?")).toBeNull();
  });

  it("parses installment months and monthly payment", () => {
    expect(parseInstallmentTerms("12 months at 2,500 per month")).toEqual({
      installmentMonths: 12,
      monthlyPayment: 2500,
    });
  });

  it("extracts an editable purchase draft and requires confirmation before analysis", () => {
    const draft = extractPurchaseFromTranscript(
      "Can I buy a phone for 25k on installment, 12 months at 2500 per month? I can wait."
    );

    expect(draft).toMatchObject({
      itemName: "phone",
      amount: 25000,
      paymentMethod: "installment",
      installmentMonths: 12,
      monthlyPayment: 2500,
      urgency: "can_wait",
      requiresConfirmation: true,
    });
  });

  it("infers non-cash payment methods and urgency phrases", () => {
    expect(extractPurchaseFromTranscript("Need now: buy a camera for 12k on credit card")).toMatchObject({
      paymentMethod: "credit_card",
      urgency: "need_now",
    });
    expect(extractPurchaseFromTranscript("Can I buy a bike for 18k using a loan this month?")).toMatchObject({
      paymentMethod: "loan",
      urgency: "need_this_month",
    });
    expect(extractPurchaseFromTranscript("Buy headphones for 5k with BNPL")).toMatchObject({
      paymentMethod: "bnpl",
      urgency: "want",
    });
  });

  it("returns a low-confidence draft when amount extraction fails", () => {
    expect(extractPurchaseFromTranscript("Can I buy this soon?")).toMatchObject({
      amount: undefined,
      confidence: 0.36,
      requiresConfirmation: true,
    });
  });
});
