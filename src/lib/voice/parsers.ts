import type { PaymentMethod, PurchaseUrgency, VoicePurchaseDraft } from "@/types/finance";

const amountPattern =
  /(?:₱|php|peso(?:s)?|for|around|about|worth|costs?)\s*([0-9]+(?:\.[0-9]+)?\s*k|[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\b/i;

function parseNumericAmount(value: string): number {
  const trimmed = value.trim().toLowerCase();
  const multiplier = trimmed.endsWith("k") ? 1000 : 1;
  const normalized = trimmed.replace(/k$/, "").replace(/,/g, "");

  return Math.round(Number(normalized) * multiplier);
}

export function parsePesoAmount(input: string): number | null {
  const match = input.match(amountPattern);

  if (!match?.[1]) {
    return null;
  }

  const amount = parseNumericAmount(match[1]);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function parseInstallmentTerms(input: string): {
  installmentMonths: number;
  monthlyPayment: number;
} | null {
  const terms = input.match(
    /(\d{1,2})\s*(?:months?|mos?)\s*(?:at|for|x)?\s*(?:₱|php|peso(?:s)?)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?\s*k)\s*(?:\/mo|per month|monthly|a month)?/i
  );

  if (!terms?.[1] || !terms?.[2]) {
    return null;
  }

  const installmentMonths = Number(terms[1]);
  const monthlyPayment = parseNumericAmount(terms[2]);

  if (!Number.isFinite(installmentMonths) || !Number.isFinite(monthlyPayment)) {
    return null;
  }

  return { installmentMonths, monthlyPayment };
}

function extractItemName(input: string): string | undefined {
  const match = input.match(/buy\s+(?:an|a|the)?\s*([a-z0-9 -]+?)\s+(?:for|at|worth|on)/i);
  return match?.[1]?.trim();
}

function inferPaymentMethod(input: string): PaymentMethod {
  const value = input.toLowerCase();

  if (value.includes("installment") || value.includes("monthly")) {
    return "installment";
  }

  if (value.includes("credit card")) {
    return "credit_card";
  }

  if (value.includes("loan")) {
    return "loan";
  }

  if (value.includes("bnpl") || value.includes("buy now")) {
    return "bnpl";
  }

  return "cash";
}

function inferUrgency(input: string): PurchaseUrgency {
  const value = input.toLowerCase();

  if (value.includes("need now") || value.includes("today") || value.includes("urgent")) {
    return "need_now";
  }

  if (value.includes("this month")) {
    return "need_this_month";
  }

  if (value.includes("can wait") || value.includes("not urgent")) {
    return "can_wait";
  }

  return "want";
}

export function extractPurchaseFromTranscript(transcript: string): VoicePurchaseDraft {
  const amount = parsePesoAmount(transcript) ?? undefined;
  const installment = parseInstallmentTerms(transcript);

  return {
    transcript,
    itemName: extractItemName(transcript),
    amount,
    paymentMethod: inferPaymentMethod(transcript),
    urgency: inferUrgency(transcript),
    installmentMonths: installment?.installmentMonths,
    monthlyPayment: installment?.monthlyPayment,
    requiresConfirmation: true,
    confidence: amount ? 0.74 : 0.36,
  };
}
