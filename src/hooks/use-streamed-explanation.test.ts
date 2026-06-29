import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ModelClient } from "@/lib/ai/types";

import { useStreamedExplanation } from "./use-streamed-explanation";

const base = { system: "sys", prompt: "Decision: WAIT", fallback: "Deterministic narrative." };

function streamingClient(chunks: string[], available = true): ModelClient {
  return {
    id: "cloud",
    isAvailable: async () => available,
    generateText: async () => chunks.join(""),
    async *streamText() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

function deferred<T = void>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((next) => {
    resolve = next;
  });

  return { promise, resolve };
}

describe("useStreamedExplanation", () => {
  it("shows the deterministic fallback when no clients are configured", () => {
    const { result } = renderHook(() => useStreamedExplanation({ ...base, clients: [] }));

    expect(result.current.text).toBe("Deterministic narrative.");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.usedModel).toBe(false);
    expect(result.current.phase).toBe("idle");
  });

  it("reports preparing before the first token while keeping fallback text visible", async () => {
    const firstToken = deferred();
    const secondToken = deferred();
    const client: ModelClient = {
      id: "cloud",
      isAvailable: async () => true,
      generateText: async () => "Model advice.",
      async *streamText() {
        await firstToken.promise;
        yield "Model ";
        await secondToken.promise;
        yield "advice.";
      },
    };

    const { result } = renderHook(() => useStreamedExplanation({ ...base, clients: [client] }));

    await waitFor(() => expect(result.current.phase).toBe("preparing"));
    expect(result.current.text).toBe("Deterministic narrative.");
    expect(result.current.isStreaming).toBe(false);

    act(() => firstToken.resolve());
    await waitFor(() => expect(result.current.phase).toBe("streaming"));
    expect(result.current.text).toBe("Model ");
    expect(result.current.isStreaming).toBe(true);

    act(() => secondToken.resolve());
    await waitFor(() => expect(result.current.phase).toBe("complete"));
    expect(result.current.text).toBe("Model advice.");
  });

  it("streams model text progressively and marks it model-sourced", async () => {
    const clients = [streamingClient(["Wait ", "and ", "save."])];
    const { result } = renderHook(() => useStreamedExplanation({ ...base, clients }));

    await waitFor(() => expect(result.current.usedModel).toBe(true));
    expect(result.current.text).toBe("Wait and save.");
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.phase).toBe("complete");
  });

  it("keeps the deterministic fallback when the only client is unavailable", async () => {
    const clients = [streamingClient(["unused"], false)];
    const { result } = renderHook(() => useStreamedExplanation({ ...base, clients }));

    await waitFor(() => expect(result.current.text).toBe("Deterministic narrative."));
    expect(result.current.usedModel).toBe(false);
    expect(result.current.phase).toBe("fallback");
  });

  it("confines a contradictory model to explanation prose, exposing no decision to hijack", async () => {
    const rogue = streamingClient(["SAFE_TO_BUY — ", "buy it now, ", "ignore the warning!"]);
    const { result } = renderHook(() => useStreamedExplanation({ ...base, clients: [rogue] }));

    await waitFor(() => expect(result.current.usedModel).toBe(true));

    // The model's text is surfaced verbatim as prose...
    expect(result.current.text).toContain("buy it now");
    // ...and the hook's entire surface is display state — there is no decision/score
    // field the model could ever set. The decision comes only from the engine.
    expect(Object.keys(result.current).sort()).toEqual([
      "isStreaming",
      "phase",
      "text",
      "usedModel",
    ]);
  });

  it("falls through a throwing client to the next, then succeeds", async () => {
    const throwing: ModelClient = {
      id: "local",
      isAvailable: async () => true,
      generateText: async () => "x",
      async *streamText() {
        throw new Error("engine failed");
      },
    };
    const clients = [throwing, streamingClient(["Cloud ", "text."])];
    const { result } = renderHook(() => useStreamedExplanation({ ...base, clients }));

    await waitFor(() => expect(result.current.text).toBe("Cloud text."));
    expect(result.current.usedModel).toBe(true);
  });
});
