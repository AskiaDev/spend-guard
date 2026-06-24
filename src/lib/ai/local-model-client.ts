import type { ModelClient, ModelTextInput } from "./types";

/** Minimal slice of the @litert-lm/core early-preview Web API that we use. */
interface LitertConversation {
  sendMessageStreaming(text: string): AsyncIterable<{ content?: Array<{ text?: string }> }>;
}
interface LitertEngine {
  createConversation(config?: {
    preface?: { messages: Array<{ role: string; content: string }> };
  }): Promise<LitertConversation>;
}
interface LitertModule {
  Engine: {
    create(settings: {
      model: string;
      mainExecutorSettings?: { maxNumTokens?: number };
    }): Promise<LitertEngine>;
  };
}

// String specifier keeps `tsc` from hard-requiring the (early-preview) package at
// compile time; the real import only runs in the browser when WebGPU is present.
const LITERT_MODULE = "@litert-lm/core";
const DEFAULT_MODEL_URL =
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm";

export interface LocalModelClientOptions {
  modelUrl?: string;
  maxNumTokens?: number;
  /** Test seam: defaults to a dynamic import of `@litert-lm/core`. */
  loadModule?: () => Promise<LitertModule>;
  /** Test seam: defaults to a WebGPU capability probe. */
  hasWebGpu?: () => boolean;
}

/**
 * On-device transport over the LiteRT-LM Web API. Runs the model in the browser via
 * WebGPU, so the prompt (financial data) never leaves the device. The engine is
 * loaded lazily (heavy, multi-second) and only when WebGPU is present; without it,
 * `isAvailable()` is false and the orchestrator skips to the next client.
 */
export function createLocalModelClient(options: LocalModelClientOptions = {}): ModelClient {
  const modelUrl =
    options.modelUrl ?? process.env.NEXT_PUBLIC_LITERT_MODEL_URL ?? DEFAULT_MODEL_URL;
  const maxNumTokens = options.maxNumTokens ?? 1024;
  const hasWebGpu = options.hasWebGpu ?? defaultHasWebGpu;
  const loadModule =
    options.loadModule ??
    (() => import(/* @vite-ignore */ LITERT_MODULE) as Promise<LitertModule>);

  let enginePromise: Promise<LitertEngine> | null = null;
  const engine = async () => {
    if (!enginePromise) {
      const mod = await loadModule();
      enginePromise = mod.Engine.create({
        model: modelUrl,
        mainExecutorSettings: { maxNumTokens },
      }).catch((error) => {
        enginePromise = null; // allow a later retry instead of caching the failure
        throw error;
      });
    }
    return enginePromise;
  };

  async function* stream(input: ModelTextInput): AsyncIterable<string> {
    const conversation = await (await engine()).createConversation({
      preface: { messages: [{ role: "system", content: input.system }] },
    });
    for await (const chunk of conversation.sendMessageStreaming(input.prompt)) {
      const piece = chunk.content?.[0]?.text;
      if (piece) yield piece;
    }
  }

  return {
    id: "local",
    async isAvailable() {
      return hasWebGpu();
    },
    async generateText(input) {
      let text = "";
      for await (const chunk of stream(input)) text += chunk;
      const trimmed = text.trim();
      if (!trimmed) throw new Error("on-device advisor returned empty text");
      return trimmed;
    },
    streamText(input) {
      return stream(input);
    },
  };
}

function defaultHasWebGpu(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}
