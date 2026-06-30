"use client";

import { useEffect, useState } from "react";

import { resolveModelClients } from "@/lib/ai/resolve-model-clients";
import type { ModelClient } from "@/lib/ai/types";

export const FIRST_TOKEN_TIMEOUT_MS = 8_000;

export type StreamedExplanationPhase =
  | "idle"
  | "checking"
  | "preparing"
  | "streaming"
  | "complete"
  | "fallback";

export interface StreamedExplanation {
  text: string;
  isStreaming: boolean;
  usedModel: boolean;
  phase: StreamedExplanationPhase;
}

interface UseStreamedExplanationArgs {
  system: string;
  prompt: string;
  /** Deterministic narrative shown until/unless a model produces text. */
  fallback: string;
  /** Injectable for tests; defaults to the env-resolved chain. Pass a stable `[]` to disable. */
  clients?: ModelClient[];
  /** Test seam for stalled providers; production keeps the default timeout. */
  firstTokenTimeoutMs?: number;
}

function nextWithTimeout(
  iterator: AsyncIterator<string>,
  timeoutMs: number
): Promise<IteratorResult<string>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<IteratorResult<string>>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("advisor explanation timed out before the first token")),
      timeoutMs
    );
  });

  return Promise.race([iterator.next(), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
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
  firstTokenTimeoutMs = FIRST_TOKEN_TIMEOUT_MS,
}: UseStreamedExplanationArgs): StreamedExplanation {
  const [text, setText] = useState(fallback);
  const [isStreaming, setIsStreaming] = useState(false);
  const [usedModel, setUsedModel] = useState(false);
  const [phase, setPhase] = useState<StreamedExplanationPhase>("idle");

  useEffect(() => {
    const chain = clients ?? resolveModelClients();
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;

      setText(fallback);
      setIsStreaming(false);
      setUsedModel(false);

      if (chain.length === 0) {
        setPhase("idle");
        return;
      }

      for (const client of chain) {
        if (!client.streamText) continue;
        try {
          setPhase("checking");
          if (!(await client.isAvailable())) continue;
          if (cancelled) return;

          let accumulated = "";
          let started = false;
          setPhase("preparing");
          const iterator = client.streamText({ system, prompt })[Symbol.asyncIterator]();
          while (true) {
            const next = started
              ? await iterator.next()
              : await nextWithTimeout(iterator, firstTokenTimeoutMs);
            if (cancelled) return;
            if (next.done) break;
            const chunk = next.value;
            accumulated += chunk;
            if (!accumulated.trim()) continue;
            if (!started) {
              started = true;
              setIsStreaming(true);
              setPhase("streaming");
            }
            setText(accumulated);
          }

          if (accumulated.trim()) {
            if (!cancelled) {
              setUsedModel(true);
              setIsStreaming(false);
              setPhase("complete");
            }
            return;
          }
        } catch {
          // Unavailable or failed mid-stream — drop the indicator and try the next client.
          if (!cancelled) {
            setText(fallback);
            setUsedModel(false);
            setIsStreaming(false);
          }
        }
      }

      if (!cancelled) {
        setIsStreaming(false);
        setUsedModel(false);
        setText(fallback);
        setPhase("fallback");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [system, prompt, fallback, clients, firstTokenTimeoutMs]);

  return { text, isStreaming, usedModel, phase };
}
