"use client";

import { useEffect, useState } from "react";

import { resolveModelClients } from "@/lib/ai/resolve-model-clients";
import type { ModelClient } from "@/lib/ai/types";

export interface StreamedExplanation {
  text: string;
  isStreaming: boolean;
  usedModel: boolean;
}

interface UseStreamedExplanationArgs {
  system: string;
  prompt: string;
  /** Deterministic narrative shown until/unless a model produces text. */
  fallback: string;
  /** Injectable for tests; defaults to the env-resolved chain. Pass a stable `[]` to disable. */
  clients?: ModelClient[];
}

/**
 * Streams the advisor explanation from the first available model client in the
 * chain, falling back to the deterministic narrative. The fallback shows
 * immediately and stays until the model's first token arrives — the user never
 * sees a blank or spinner-only state, and an unavailable/failed model degrades to
 * deterministic text. The model only explains; the decision and numbers come from
 * the engine, never from this stream.
 */
export function useStreamedExplanation({
  system,
  prompt,
  fallback,
  clients,
}: UseStreamedExplanationArgs): StreamedExplanation {
  const [text, setText] = useState(fallback);
  const [isStreaming, setIsStreaming] = useState(false);
  const [usedModel, setUsedModel] = useState(false);

  useEffect(() => {
    const chain = clients ?? resolveModelClients();
    if (chain.length === 0) {
      return;
    }

    let cancelled = false;

    (async () => {
      for (const client of chain) {
        if (!client.streamText) continue;
        try {
          if (!(await client.isAvailable())) continue;

          let accumulated = "";
          let started = false;
          for await (const chunk of client.streamText({ system, prompt })) {
            if (cancelled) return;
            accumulated += chunk;
            if (!started) {
              started = true;
              setIsStreaming(true);
            }
            setText(accumulated);
          }

          if (accumulated.trim()) {
            if (!cancelled) {
              setUsedModel(true);
              setIsStreaming(false);
            }
            return;
          }
        } catch {
          // Unavailable or failed mid-stream — drop the indicator and try the next client.
          if (!cancelled) setIsStreaming(false);
        }
      }

      if (!cancelled) {
        setIsStreaming(false);
        setText(fallback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [system, prompt, fallback, clients]);

  return { text, isStreaming, usedModel };
}
