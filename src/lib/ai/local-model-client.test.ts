import { describe, expect, it, vi } from "vitest";

import { createLocalModelClient } from "./local-model-client";

const input = { system: "sys", prompt: "Decision: WAIT" };

function conversationYielding(chunks: string[]) {
  return vi.fn(async () => ({
    async *sendMessageStreaming() {
      for (const text of chunks) yield { content: [{ text }] };
    },
  }));
}

function fakeModule(chunks: string[]) {
  return {
    Engine: {
      create: vi.fn(async () => ({
        createConversation: conversationYielding(chunks),
        delete: vi.fn(async () => {}),
      })),
    },
  };
}

describe("createLocalModelClient", () => {
  it("is the local transport, unavailable without WebGPU, and loads no model", async () => {
    const loadModule = vi.fn();
    const client = createLocalModelClient({ hasWebGpu: () => false, loadModule });

    expect(client.id).toBe("local");
    await expect(client.isAvailable()).resolves.toBe(false);
    expect(loadModule).not.toHaveBeenCalled();
  });

  it("streams on-device tokens when WebGPU is present", async () => {
    const client = createLocalModelClient({
      hasWebGpu: () => true,
      loadModule: async () => fakeModule(["Wait ", "and ", "save."]),
    });

    let out = "";
    for await (const chunk of client.streamText!(input)) out += chunk;
    expect(out).toBe("Wait and save.");
  });

  it("concatenates streamed tokens for generateText", async () => {
    const client = createLocalModelClient({
      hasWebGpu: () => true,
      loadModule: async () => fakeModule(["Wait ", "and ", "save."]),
    });

    await expect(client.generateText(input)).resolves.toBe("Wait and save.");
  });

  it("passes the system prompt via the preface and reuses one cached engine", async () => {
    const createConversation = conversationYielding(["ok"]);
    const create = vi.fn(async () => ({ createConversation, delete: vi.fn() }));
    const client = createLocalModelClient({
      hasWebGpu: () => true,
      loadModule: async () => ({ Engine: { create } }),
    });

    await client.generateText(input);
    await client.generateText(input);

    expect(createConversation).toHaveBeenCalledWith({
      preface: { messages: [{ role: "system", content: "sys" }] },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("throws on empty output so the chain falls through", async () => {
    const client = createLocalModelClient({
      hasWebGpu: () => true,
      loadModule: async () => fakeModule(["   "]),
    });

    await expect(client.generateText(input)).rejects.toThrow();
  });

  it("does not cache a failed engine load, allowing a later retry", async () => {
    let attempt = 0;
    const create = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("load failed");
      return { createConversation: conversationYielding(["ok"]), delete: vi.fn() };
    });
    const client = createLocalModelClient({
      hasWebGpu: () => true,
      loadModule: async () => ({ Engine: { create } }),
    });

    await expect(client.generateText(input)).rejects.toThrow("load failed");
    await expect(client.generateText(input)).resolves.toBe("ok");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("suppresses known LiteRT runtime console noise without hiding other errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client = createLocalModelClient({
      hasWebGpu: () => true,
      loadModule: async () => ({
        Engine: {
          create: vi.fn(async () => {
            console.error("INFO: [environment.cc:30] Creating LiteRT environment with options");
            console.error(
              "WARNING: [npu_registry.cc:34] NPU accelerator could not be loaded and registered"
            );
            console.warn("Missing 10 bands starting at 0 in mel-frequency design.");
            console.error("real application error");
            return { createConversation: conversationYielding(["ok"]), delete: vi.fn() };
          }),
        },
      }),
    });

    await expect(client.generateText(input)).resolves.toBe("ok");

    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith("real application error");
    expect(consoleWarn).not.toHaveBeenCalled();

    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});
