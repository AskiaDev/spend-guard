import type { ModelClient } from "./types";

/**
 * Deterministic in-process client for tests and local development
 * (`NEXT_PUBLIC_AI_PROVIDER=mock`). No network, no model load, so output is
 * stable and offline-safe. It deliberately omits `generateObject` so transcript
 * extraction falls back to the regex parser in mock mode.
 */
export function createMockModelClient(): ModelClient {
  return {
    id: "mock",
    async isAvailable() {
      return true;
    },
    async generateText({ prompt }) {
      return mockAdvice(prompt);
    },
    async *streamText({ prompt }) {
      for (const chunk of mockAdvice(prompt).match(/\S+\s*/g) ?? []) {
        yield chunk;
      }
    },
  };
}

function mockAdvice(prompt: string): string {
  const firstLine = prompt.split("\n", 1)[0]?.trim() ?? "";
  return `Mock advisor explanation. ${firstLine}`.trim();
}
