import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveServerModel } from "./model-spec";

const anthropicCreate = vi.fn((id: string) => ({ provider: "anthropic", id }));
const openaiCreate = vi.fn((id: string) => ({ provider: "openai", id }));

vi.mock("@ai-sdk/anthropic", () => ({ anthropic: (id: string) => anthropicCreate(id) }));
vi.mock("@ai-sdk/openai", () => ({ openai: (id: string) => openaiCreate(id) }));

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  vi.clearAllMocks();
});

describe("resolveServerModel", () => {
  it("resolves an anthropic spec when the key is present", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const model = resolveServerModel("anthropic:claude-haiku-4-5");

    expect(anthropicCreate).toHaveBeenCalledWith("claude-haiku-4-5");
    expect(model).toMatchObject({ provider: "anthropic", id: "claude-haiku-4-5" });
  });

  it("resolves an openai spec when the key is present", () => {
    process.env.OPENAI_API_KEY = "test-key";
    const model = resolveServerModel("openai:gpt-4o-mini");

    expect(openaiCreate).toHaveBeenCalledWith("gpt-4o-mini");
    expect(model).toMatchObject({ provider: "openai", id: "gpt-4o-mini" });
  });

  it("throws on an unknown provider", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    expect(() => resolveServerModel("llama:7b")).toThrow(/Unsupported ADVISOR_MODEL/);
  });

  it("throws on a malformed spec (no model id)", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    expect(() => resolveServerModel("anthropic")).toThrow(/Unsupported ADVISOR_MODEL/);
  });

  it("throws when the provider's API key is missing", () => {
    expect(() => resolveServerModel("anthropic:claude-haiku-4-5")).toThrow(/Missing ANTHROPIC_API_KEY/);
  });
});
