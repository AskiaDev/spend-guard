import { afterEach, describe, expect, it } from "vitest";
import { resolveAuthRedirectOrigin } from "./auth-redirect-origin";

describe("resolveAuthRedirectOrigin", () => {
  const originalPortlessUrl = process.env.PORTLESS_URL;

  afterEach(() => {
    process.env.PORTLESS_URL = originalPortlessUrl;
  });

  it("uses the portless public URL when present", () => {
    process.env.PORTLESS_URL = "https://spendguard.localhost";

    expect(resolveAuthRedirectOrigin("http://localhost:3000")).toBe(
      "https://spendguard.localhost"
    );
  });

  it("falls back to the request origin", () => {
    delete process.env.PORTLESS_URL;

    expect(resolveAuthRedirectOrigin("https://preview.example")).toBe(
      "https://preview.example"
    );
  });
});
