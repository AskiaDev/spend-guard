import { streamText } from "ai";
import { z } from "zod";

import { resolveServerModel } from "@/lib/ai/model-spec";
import { requireUserId } from "@/lib/supabase/server";

const RequestSchema = z.object({
  system: z.string().min(1).max(4_000),
  prompt: z.string().min(1).max(8_000),
});

/**
 * Streams the advisor explanation from the configured cloud model. The model only
 * explains the already-computed decision (the prompt enforces it). API keys live in
 * server env and never reach the client. A missing/invalid model or key returns 503
 * so the browser client falls through to the next provider or the deterministic floor.
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
    return new Response("Invalid advisor request.", { status: 400 });
  }

  let model;
  try {
    model = resolveServerModel();
  } catch {
    return new Response("Advisor model is not configured.", { status: 503 });
  }

  const result = streamText({
    model,
    system: parsed.data.system,
    prompt: parsed.data.prompt,
  });
  return result.toTextStreamResponse();
}
