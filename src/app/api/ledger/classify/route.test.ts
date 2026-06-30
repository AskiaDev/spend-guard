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

function fileRequest(file: File): Request {
  if (!("arrayBuffer" in file)) {
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new TextEncoder().encode("statement").buffer,
    });
  }

  const form = new FormData();
  form.append("image", file);

  return { formData: async () => form } as Request;
}

beforeEach(() => {
  requireUserIdMock.mockResolvedValue({ userId: "user-1" });
  resolveModelMock.mockReturnValue({});
});

afterEach(() => vi.clearAllMocks());

describe("POST /api/ledger/classify", () => {
  it("returns every transaction extracted from a statement file", async () => {
    const candidates = [
      {
        occurredAt: "2026-05-02",
        direction: "income",
        amount: 11.15,
        counterparty: "Interest",
        category: "income_other",
        confidence: 0.91,
      },
      {
        occurredAt: "2026-05-03",
        direction: "expense",
        amount: 10_000,
        counterparty: "Askia James Manjares",
        category: "transfer",
        confidence: 0.86,
      },
    ];
    generateObjectMock.mockResolvedValue({ object: { transactions: candidates } });

    const res = await POST(
      fileRequest(new File(["statement"], "statement.pdf", { type: "application/pdf" }))
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ candidates });
    expect(generateObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({ schemaName: "LedgerTransactionBatch" })
    );
    const content = generateObjectMock.mock.calls[0][0].messages[0].content;
    expect(content[0].text).toContain("Extract every visible transaction");
    expect(content[1]).toMatchObject({
      type: "file",
      filename: "statement.pdf",
      mediaType: "application/pdf",
    });
  });
});
