import { generateObject } from "ai";

import { resolveServerModel } from "@/lib/ai/model-spec";
import { LEDGER_CATEGORIES, ledgerCandidateBatchSchema } from "@/lib/schemas/ledger";
import { requireUserId } from "@/lib/supabase/server";

const CLASSIFY_PROMPT = [
  "You are reading financial transactions from a receipt, e-wallet screenshot,",
  "bank screenshot, or bank statement PDF (GCash, GoTyme, Maya, Maribank,",
  "SeaBank, or a Philippine bank).",
  "Extract every visible transaction. For a single receipt, return one transaction.",
  "For bank statements with many dated rows, return one item per transaction row;",
  "do not summarize totals or collapse rows into one transaction.",
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
  const uploadPart =
    image.type === "application/pdf"
      ? {
          type: "file" as const,
          data: bytes,
          filename: image.name,
          mediaType: image.type,
        }
      : { type: "image" as const, image: bytes, mediaType: image.type };

  try {
    const { object } = await generateObject({
      model,
      schema: ledgerCandidateBatchSchema,
      schemaName: "LedgerTransactionBatch",
      schemaDescription: "Financial transactions extracted from one upload.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: CLASSIFY_PROMPT },
            uploadPart,
          ],
        },
      ],
    });

    return Response.json({ candidates: object.transactions });
  } catch {
    // Model could not produce a schema-valid object (bad image, refusal, etc.).
    return Response.json({ error: "Could not read this image." }, { status: 422 });
  }
}
