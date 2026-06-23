import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "./auth-routing";

describe("getAuthRedirect", () => {
  it("sends unauthenticated dashboard requests to login", () => {
    expect(getAuthRedirect("/", false)).toBe("/login");
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
