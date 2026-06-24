import { afterEach, describe, expect, it, vi } from "vitest";

import { createCloudModelClient } from "./cloud-model-client";

function streamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status });
}

afterEach(() => vi.unstubAllGlobals());

describe("createCloudModelClient", () => {
  const input = { system: "sys", prompt: "Decision: WAIT" };

  it("is identified as the cloud transport and optimistically available", async () => {
    const client = createCloudModelClient();
    expect(client.id).toBe("cloud");
    await expect(client.isAvailable()).resolves.toBe(true);
  });

  it("streams text chunks from the route", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => streamResponse(["Wait ", "and ", "save."])));
    const client = createCloudModelClient();

    let out = "";
    for await (const chunk of client.streamText!(input)) out += chunk;
    expect(out).toBe("Wait and save.");
  });

  it("drains the stream into full text for generateText", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => streamResponse(["Wait ", "and ", "save."])));

    await expect(createCloudModelClient().generateText(input)).resolves.toBe("Wait and save.");
  });

  it("throws on a non-200 (missing key/model) so the chain falls through", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));

    await expect(createCloudModelClient().generateText(input)).rejects.toThrow();
  });

  it("posts system + prompt as JSON to the explain endpoint", async () => {
    const fetchMock = vi.fn(async () => streamResponse(["ok"]));
    vi.stubGlobal("fetch", fetchMock);

    await createCloudModelClient().generateText(input);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/advisor/explain",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });
});
