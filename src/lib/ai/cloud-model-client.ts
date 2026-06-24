import type { ModelClient, ModelTextInput } from "./types";

export const EXPLAIN_ENDPOINT = "/api/advisor/explain";

/**
 * Cloud transport. Runs entirely in the browser and only `fetch()`s the server
 * route handler — it never imports `@ai-sdk/*`, so API keys and the model SDK stay
 * server-side. The route streams plain text; `generateText` drains that stream.
 *
 * Availability cannot be checked from the client (it can't see the server key), so
 * it is optimistic: a missing key/model makes the route return a non-200, which the
 * stream surfaces as a thrown error and the orchestrator falls through to the next
 * client (or the deterministic floor).
 */
export function createCloudModelClient(endpoint: string = EXPLAIN_ENDPOINT): ModelClient {
  return {
    id: "cloud",
    async isAvailable() {
      return true;
    },
    async generateText(input) {
      let text = "";
      for await (const chunk of streamFromRoute(endpoint, input)) text += chunk;
      const trimmed = text.trim();
      if (!trimmed) throw new Error("cloud advisor returned empty text");
      return trimmed;
    },
    streamText(input) {
      return streamFromRoute(endpoint, input);
    },
  };
}

async function* streamFromRoute(
  endpoint: string,
  input: ModelTextInput
): AsyncIterable<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok || !response.body) {
    throw new Error(`cloud advisor request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) yield decoder.decode(value, { stream: true });
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}
