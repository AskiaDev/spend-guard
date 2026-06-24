import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateObjectMock, resolveModelMock, requireUserIdMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
  resolveModelMock: vi.fn(),
  requireUserIdMock: vi.fn(),
}));

vi.mock("ai", () => ({ generateObject: generateObjectMock }));
vi.mock("@/lib/ai/model-spec", () => ({ resolveServerModel: resolveModelMock }));
vi.mock("@/lib/supabase/server", () => ({ requireUserId: requireUserIdMock }));

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://test/api/advisor/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => requireUserIdMock.mockResolvedValue({ userId: "user-1" }));
afterEach(() => vi.clearAllMocks());

describe("POST /api/advisor/extract", () => {
  const draft = {
    itemName: "Phone",
    amount: 25_000,
    downPayment: null,
    installmentMonths: null,
    monthlyPayment: null,
    paymentMethod: "cash",
    urgency: "want",
  };

  it("returns 401 when the request is unauthenticated", async () => {
    requireUserIdMock.mockRejectedValueOnce(new Error("Authentication required."));

    const res = await POST(jsonRequest({ transcript: "buy a phone for 25k" }));

    expect(res.status).toBe(401);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("returns the extracted object for a valid transcript", async () => {
    resolveModelMock.mockReturnValue({});
    generateObjectMock.mockResolvedValue({ object: draft });

    const res = await POST(jsonRequest({ transcript: "Can I buy a phone for 25k?" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(draft);
    expect(generateObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "Can I buy a phone for 25k?" })
    );
  });

  it("returns 400 for a missing transcript", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the model/key is not configured", async () => {
    resolveModelMock.mockImplementation(() => {
      throw new Error("Missing ANTHROPIC_API_KEY");
    });

    const res = await POST(jsonRequest({ transcript: "buy a phone for 25k" }));
    expect(res.status).toBe(503);
  });

  it("returns 502 when generation fails", async () => {
    resolveModelMock.mockReturnValue({});
    generateObjectMock.mockRejectedValue(new Error("model error"));

    const res = await POST(jsonRequest({ transcript: "buy a phone for 25k" }));
    expect(res.status).toBe(502);
  });
});
