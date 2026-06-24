import { generateObject } from "ai";
import { z } from "zod";

import { resolveServerModel } from "@/lib/ai/model-spec";
import { requireUserId } from "@/lib/supabase/server";
import { extractedPurchaseSchema } from "@/lib/voice/draft-schema";

const RequestSchema = z.object({ transcript: z.string().min(1).max(4_000) });

const SYSTEM =
  "Extract structured purchase details from a short spoken request by a Filipino user. Amounts are in Philippine pesos (a plain number, no symbol). Use null whenever a field is not clearly stated — do not guess. This only fills a form the user will review and confirm; it never decides anything.";

/**
 * Structured §20.5 extraction via the cloud model. The browser keeps the regex
 * parser as its fallback, so a missing model/key (503) or a generation failure
 * (502) simply means the client uses regex instead.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireUserId();
  } catch {
    // Paid model call — only authenticated users may invoke it (cost protection).
    return new Response("Unauthorized.", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Invalid extraction request.", { status: 400 });
  }

  let model;
  try {
    model = resolveServerModel();
  } catch {
    return new Response("Advisor model is not configured.", { status: 503 });
  }

  try {
    const { object } = await generateObject({
      model,
      schema: extractedPurchaseSchema,
      system: SYSTEM,
      prompt: parsed.data.transcript,
    });
    return Response.json(object);
  } catch {
    return new Response("Extraction failed.", { status: 502 });
  }
}
