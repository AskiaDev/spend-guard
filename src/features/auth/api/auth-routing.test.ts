import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "./auth-routing";

describe("getAuthRedirect", () => {
  it("sends unauthenticated dashboard requests to login", () => {
    expect(getAuthRedirect("/", false)).toBe("/login");
  });

  it("sends unauthenticated app route requests to login", () => {
    for (const path of [
      "/checker",
      "/checker/result",
      "/cooldown",
      "/goals",
      "/onboarding",
      "/reports",
      "/voice",
    ]) {
      expect(getAuthRedirect(path, false)).toBe("/login");
    }
  });

  it("allows authenticated users to reach protected app routes", () => {
    for (const path of ["/", "/checker", "/goals", "/voice"]) {
      expect(getAuthRedirect(path, true)).toBeNull();
    }
  });

  it("sends authenticated users away from login and signup", () => {
    expect(getAuthRedirect("/login", true)).toBe("/");
    expect(getAuthRedirect("/signup", true)).toBe("/");
  });

  it("allows confirmation and valid destination requests", () => {
    expect(getAuthRedirect("/auth/confirm", false)).toBeNull();
    expect(getAuthRedirect("/", true)).toBeNull();
  });
});
