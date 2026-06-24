import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { streamTextMock, resolveModelMock, requireUserIdMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
  resolveModelMock: vi.fn(),
  requireUserIdMock: vi.fn(),
}));

vi.mock("ai", () => ({ streamText: streamTextMock }));
vi.mock("@/lib/ai/model-spec", () => ({ resolveServerModel: resolveModelMock }));
vi.mock("@/lib/supabase/server", () => ({ requireUserId: requireUserIdMock }));

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://test/api/advisor/explain", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => requireUserIdMock.mockResolvedValue({ userId: "user-1" }));
afterEach(() => vi.clearAllMocks());

describe("POST /api/advisor/explain", () => {
  const valid = { system: "sys", prompt: "Decision: WAIT" };

  it("returns 401 when the request is unauthenticated", async () => {
    requireUserIdMock.mockRejectedValueOnce(new Error("Authentication required."));

    const res = await POST(jsonRequest(valid));

    expect(res.status).toBe(401);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("streams advisor text for a valid request", async () => {
    resolveModelMock.mockReturnValue({});
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response("Wait and save.", { status: 200 }),
    });

    const res = await POST(jsonRequest(valid));

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("Wait and save.");
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ system: "sys", prompt: "Decision: WAIT" })
    );
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await POST(jsonRequest("{not json"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(jsonRequest({ system: "" }));
    expect(res.status).toBe(400);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the model/key is not configured", async () => {
    resolveModelMock.mockImplementation(() => {
      throw new Error("Missing ANTHROPIC_API_KEY");
    });

    const res = await POST(jsonRequest(valid));

    expect(res.status).toBe(503);
    expect(streamTextMock).not.toHaveBeenCalled();
  });
});
