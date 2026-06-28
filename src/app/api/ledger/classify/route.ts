import { generateObject } from "ai";

import { resolveServerModel } from "@/lib/ai/model-spec";
import { isAutoConfirmEligible } from "@/features/ledger/lib/auto-confirm";
import { LEDGER_CATEGORIES, ledgerCandidateSchema } from "@/lib/schemas/ledger";
import { requireUserId } from "@/lib/supabase/server";

const CLASSIFY_PROMPT = [
  "You are reading a single financial transaction from a receipt or e-wallet/bank",
  "screenshot (GCash, GoTyme, Maya, Maribank, SeaBank, or a Philippine bank).",
  "Extract exactly one transaction.",
  "- amount: the transaction total, a positive number, no currency symbol.",
  "- direction: 'income' if money came in, 'expense' if money went out.",
  "- occurredAt: the transaction date as YYYY-MM-DD, or null if not visible.",
  "- counterparty: the merchant, sender, or recipient. If it is only a person's",
  "  name with no merchant (e.g. an InstaPay transfer), keep that name.",
  `- category: choose one of ${LEDGER_CATEGORIES.join(", ")}. If the data does not`,
  "  clearly identify a category (e.g. a transfer to a personal name), use",
  "  'uncategorized' and a low confidence.",
  "- confidence: 0..1, your certainty in the extraction and category.",
].join("\n");

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

// OCR runs on an OpenAI vision model, decoupled from the advisor (which runs Gemma
// on-device via LiteRT, with the cloud ADVISOR_MODEL as its own separate fallback).
// Swap with the OCR_MODEL env var ("<provider>:<modelId>"); requires OPENAI_API_KEY.
const OCR_MODEL_SPEC = process.env.OCR_MODEL ?? "openai:gpt-4o";

export async function POST(request: Request): Promise<Response> {
  try {
    await requireUserId();
  } catch {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let model;
  try {
    model = resolveServerModel(OCR_MODEL_SPEC);
  } catch (error) {
    // Surface the real reason (bad OCR_MODEL spec or missing OPENAI_API_KEY) in the
    // server log; the client still gets a generic message.
    console.error("OCR model not configured", error);
    return Response.json({ error: "Classifier model is not configured." }, { status: 503 });
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) {
    return Response.json({ error: "Missing image file." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(image.type)) {
    return Response.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return Response.json({ error: "File too large." }, { status: 400 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());

  try {
    const { object: candidate } = await generateObject({
      model,
      schema: ledgerCandidateSchema,
      schemaName: "LedgerTransactionCandidate",
      schemaDescription: "One financial transaction extracted from a receipt or wallet screenshot.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: CLASSIFY_PROMPT },
            { type: "image", image: bytes, mediaType: image.type },
          ],
        },
      ],
    });

    return Response.json({ candidate, autoConfirm: isAutoConfirmEligible(candidate) });
  } catch {
    // Model could not produce a schema-valid object (bad image, refusal, etc.).
    return Response.json({ error: "Could not read this image." }, { status: 422 });
  }
}
