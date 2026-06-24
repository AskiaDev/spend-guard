import { isTransportConfigured } from "@/lib/ai/resolve-model-clients";

import { extractedPurchaseSchema, type ExtractedPurchase } from "./draft-schema";

export const EXTRACT_ENDPOINT = "/api/advisor/extract";

/**
 * Ask the cloud model to extract structured purchase fields from a transcript
 * (§20.5). Returns null whenever extraction is unavailable or fails, so the caller
 * falls back to the regex parser. Cloud-only: the on-device model is text-only and
 * with no provider the route returns 503 → null. Gated on `cloud` being in
 * `NEXT_PUBLIC_AI_PROVIDER` so a regex-only setup makes no network call.
 */
export async function extractPurchaseWithModel(
  transcript: string,
  options: { enabled?: boolean; endpoint?: string } = {}
): Promise<ExtractedPurchase | null> {
  const enabled = options.enabled ?? isTransportConfigured("cloud");
  if (!enabled || !transcript.trim()) {
    return null;
  }

  try {
    const response = await fetch(options.endpoint ?? EXTRACT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    if (!response.ok) {
      return null;
    }
    const parsed = extractedPurchaseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
