/**
 * Model-agnostic seam. A `ModelClient` is any text generator the advisor can talk
 * to — on-device (LiteRT-LM Web), cloud (AI SDK), or a deterministic mock.
 * Selecting or reordering clients is configuration (env), never a code change.
 *
 * The seam is text-only on purpose: text is what all three transports share and
 * what the advisor explanation needs. The deterministic fallback narrative is NOT
 * a ModelClient — it lives in the advisor domain as the always-on floor. Structured
 * transcript extraction (§20.5) is handled separately (a dedicated cloud route),
 * because a Zod schema cannot cross the network.
 */
export type ModelClientId = "local" | "cloud" | "mock";

export interface ModelTextInput {
  /** System prompt (role/guardrails). */
  system: string;
  /** User prompt (the decision + numbers to explain). */
  prompt: string;
}

export interface ModelClient {
  readonly id: ModelClientId;
  /**
   * Cheap capability check (e.g. WebGPU present for local). Must not load a
   * model. When false, the orchestrator skips this client and tries the next.
   */
  isAvailable(): Promise<boolean>;
  /** Full text. Throws on failure so the caller can fall through to the next client. */
  generateText(input: ModelTextInput): Promise<string>;
  /** Optional progressive text for live UI. */
  streamText?(input: ModelTextInput): AsyncIterable<string>;
}
