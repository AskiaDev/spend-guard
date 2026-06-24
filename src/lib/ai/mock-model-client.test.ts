import { describe, expect, it } from "vitest";

import { createMockModelClient } from "./mock-model-client";

describe("createMockModelClient", () => {
  const client = createMockModelClient();

  it("identifies as the mock provider and is always available", async () => {
    expect(client.id).toBe("mock");
    await expect(client.isAvailable()).resolves.toBe(true);
  });

  it("returns deterministic advisory text that reflects the prompt", async () => {
    const input = { system: "s", prompt: "Decision: WAIT\nmore context" };
    const first = await client.generateText(input);
    const second = await client.generateText(input);

    expect(first).toBe(second);
    expect(first).toContain("Decision: WAIT");
  });

  it("streams chunks that concatenate to the full text", async () => {
    const input = { system: "s", prompt: "Decision: SAFE_TO_BUY" };
    let streamed = "";
    for await (const chunk of client.streamText!(input)) streamed += chunk;

    expect(streamed).toBe(await client.generateText(input));
  });
});
