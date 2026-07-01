import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "./auth-routing";

describe("getAuthRedirect", () => {
  it("lets unauthenticated visitors see the public landing page", () => {
    expect(getAuthRedirect("/", false)).toBeNull();
  });

  it("sends unauthenticated dashboard requests to login", () => {
    expect(getAuthRedirect("/dashboard", false)).toBe("/login");
  });

  it("sends unauthenticated app route requests to login", () => {
    for (const path of [
      "/dashboard",
      "/checker",
      "/checker/result",
      "/cooldown",
      "/debts",
      "/expenses",
      "/goals",
      "/onboarding",
      "/reports",
      "/settings",
      "/voice",
    ]) {
      expect(getAuthRedirect(path, false)).toBe("/login");
    }
  });

  it("allows onboarded authenticated users to reach protected app routes", () => {
    for (const path of [
      "/dashboard",
      "/checker",
      "/debts",
      "/expenses",
      "/goals",
      "/settings",
      "/voice",
    ]) {
      expect(getAuthRedirect(path, true, true)).toBeNull();
    }
  });

  it("lets onboarded authenticated users still view the public landing page", () => {
    expect(getAuthRedirect("/", true, true)).toBeNull();
  });

  it("sends onboarded authenticated users away from login and signup", () => {
    expect(getAuthRedirect("/login", true, true)).toBe("/dashboard");
    expect(getAuthRedirect("/signup", true, true)).toBe("/dashboard");
  });

  it("redirects onboarded users away from onboarding to the dashboard", () => {
    expect(getAuthRedirect("/onboarding", true, true)).toBe("/dashboard");
  });

  it("routes authenticated users who have not completed onboarding to onboarding", () => {
    for (const path of [
      "/dashboard",
      "/checker",
      "/debts",
      "/expenses",
      "/goals",
      "/reports",
      "/settings",
      "/login",
      "/signup",
    ]) {
      expect(getAuthRedirect(path, true, false)).toBe("/onboarding");
    }
  });

  it("lets a not-yet-onboarded user stay on the onboarding page", () => {
    expect(getAuthRedirect("/onboarding", true, false)).toBeNull();
  });

  it("lets a not-yet-onboarded user reach the explore sandbox", () => {
    expect(getAuthRedirect("/explore", true, false)).toBeNull();
  });

  it("never forces auth callback routes into onboarding", () => {
    expect(getAuthRedirect("/auth/confirm", true, false)).toBeNull();
  });

  it("allows confirmation requests and onboarded dashboard requests", () => {
    expect(getAuthRedirect("/auth/confirm", false)).toBeNull();
    expect(getAuthRedirect("/dashboard", true, true)).toBeNull();
  });

  it("allows the public offline fallback without authentication", () => {
    expect(getAuthRedirect("/offline", false)).toBeNull();
    expect(getAuthRedirect("/offline", true, false)).toBeNull();
    expect(getAuthRedirect("/offline", true, true)).toBeNull();
  });
});
