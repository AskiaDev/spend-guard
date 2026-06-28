import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

function mockSupabase(result: { error: Error | null }) {
  const exchangeCodeForSession = vi.fn().mockResolvedValue(result);
  const verifyOtp = vi.fn().mockResolvedValue(result);

  mockedCreateServerSupabaseClient.mockResolvedValue({
    auth: { exchangeCodeForSession, verifyOtp },
  } as never);

  return { exchangeCodeForSession, verifyOtp };
}

describe("auth confirmation callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges a PKCE code and sends the user to the confirmation screen", async () => {
    const { exchangeCodeForSession } = mockSupabase({ error: null });
    const response = await GET(
      new NextRequest("https://spendguard.localhost/auth/confirm?code=abc&next=/onboarding")
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe(
      "https://spendguard.localhost/auth/confirmed?status=success&next=%2Fonboarding"
    );
  });

  it("sends invalid confirmation links to the confirmation error screen", async () => {
    mockSupabase({ error: new Error("expired") });
    const response = await GET(
      new NextRequest("https://spendguard.localhost/auth/confirm?token_hash=h1&type=signup")
    );

    expect(response.headers.get("location")).toBe(
      "https://spendguard.localhost/auth/confirmed?status=error"
    );
  });
});
