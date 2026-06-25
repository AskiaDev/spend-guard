import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy, readOnboardingCompleted } from "./proxy";

function createStatusClient(result: {
  data: { onboarding_completed: boolean } | null;
  error: unknown;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { client: { from }, from, select, eq, maybeSingle };
}

describe("readOnboardingCompleted", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the persisted onboarding status", async () => {
    const { client, from, select, eq } = createStatusClient({
      data: { onboarding_completed: true },
      error: null,
    });

    await expect(readOnboardingCompleted(client, "user-1")).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("onboarding_completed");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("treats a missing profile row as not onboarded", async () => {
    const { client } = createStatusClient({ data: null, error: null });

    await expect(readOnboardingCompleted(client, "user-1")).resolves.toBe(false);
  });

  it("fails open for authenticated users when the status lookup errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { client } = createStatusClient({
      data: null,
      error: { message: "temporary outage" },
    });

    await expect(readOnboardingCompleted(client, "user-1")).resolves.toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to read onboarding status",
      { message: "temporary outage" }
    );
  });
});

describe("proxy email-confirmation rescue", () => {
  it("forwards a stray PKCE code to /auth/confirm", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/?code=abc123"));

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/confirm?code=abc123"
    );
  });

  it("forwards a stray OTP token_hash to /auth/confirm", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3000/?token_hash=h1&type=signup")
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/confirm?token_hash=h1&type=signup"
    );
  });
});
