import { afterEach, describe, expect, it, vi } from "vitest";

describe("next config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps standalone output and exposes deployment skew protection", async () => {
    vi.stubEnv("NEXT_DEPLOYMENT_ID", "spendguard-build-123");
    vi.resetModules();

    const { default: config } = await import("./next.config");

    expect(config.output).toBe("standalone");
    expect(config.deploymentId).toBe("spendguard-build-123");
  });

  it("sets explicit service worker headers", async () => {
    const { default: config } = await import("./next.config");
    const headers = await config.headers?.();

    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/sw.js",
          headers: expect.arrayContaining([
            { key: "Content-Type", value: "application/javascript; charset=utf-8" },
            { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
            { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          ]),
        }),
      ])
    );
  });
});
