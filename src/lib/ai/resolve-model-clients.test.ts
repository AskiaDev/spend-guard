import { describe, expect, it } from "vitest";

import { isTransportConfigured, resolveModelClients } from "./resolve-model-clients";

const ids = (spec: string | undefined) => resolveModelClients(spec).map((c) => c.id);

describe("resolveModelClients", () => {
  it("returns an empty chain when unset or empty (deterministic only)", () => {
    expect(resolveModelClients(undefined)).toEqual([]);
    expect(resolveModelClients("")).toEqual([]);
  });

  it("maps a single transport", () => {
    expect(ids("cloud")).toEqual(["cloud"]);
    expect(ids("local")).toEqual(["local"]);
    expect(ids("mock")).toEqual(["mock"]);
  });

  it("preserves order for a chain and tolerates whitespace", () => {
    expect(ids("local, cloud")).toEqual(["local", "cloud"]);
    expect(ids("cloud,local")).toEqual(["cloud", "local"]);
  });

  it("ignores unknown tokens instead of throwing", () => {
    expect(ids("local,banana,mock")).toEqual(["local", "mock"]);
    expect(ids("nope")).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(ids("LOCAL,Cloud")).toEqual(["local", "cloud"]);
  });
});

describe("isTransportConfigured", () => {
  it("reports whether a transport is present in the chain", () => {
    expect(isTransportConfigured("cloud", "local,cloud")).toBe(true);
    expect(isTransportConfigured("cloud", "local")).toBe(false);
    expect(isTransportConfigured("local", "local")).toBe(true);
    expect(isTransportConfigured("cloud", undefined)).toBe(false);
  });
});
