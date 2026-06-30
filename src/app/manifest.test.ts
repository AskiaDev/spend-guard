import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("manifest", () => {
  it("declares SpendGuard as an installable standalone app", () => {
    expect(manifest()).toMatchObject({
      name: "SpendGuard",
      short_name: "SpendGuard",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#0a0e17",
      theme_color: "#0a0e17",
    });
  });

  it("includes standard and maskable icons", () => {
    const icons = manifest().icons ?? [];

    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/icon-192.svg",
          sizes: "192x192",
          type: "image/svg+xml",
        }),
        expect.objectContaining({
          src: "/icons/icon-512.svg",
          sizes: "512x512",
          type: "image/svg+xml",
        }),
        expect.objectContaining({
          src: "/icons/maskable-icon.svg",
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "maskable",
        }),
      ])
    );
  });
});
