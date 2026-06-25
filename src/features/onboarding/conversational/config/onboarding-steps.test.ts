import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, isStepComplete, getStepIndex } from "./onboarding-steps";
import { createDefaultValues } from "../lib/onboarding-form";

describe("ONBOARDING_STEPS", () => {
  it("has unique ids and starts with welcome, ends with summary", () => {
    const ids = ONBOARDING_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("welcome");
    expect(ids[ids.length - 1]).toBe("summary");
  });

  it("has exactly 14 steps", () => {
    expect(ONBOARDING_STEPS.length).toBe(14);
  });

  it("all steps have id, kind, required, skippable", () => {
    for (const step of ONBOARDING_STEPS) {
      expect(step.id).toBeTruthy();
      expect(step.kind).toBeTruthy();
      expect(typeof step.required).toBe("boolean");
      expect(typeof step.skippable).toBe("boolean");
    }
  });

  it("welcome and setup-intro are interstitial and not required", () => {
    const welcome = ONBOARDING_STEPS[getStepIndex("welcome")];
    const setupIntro = ONBOARDING_STEPS[getStepIndex("setup-intro")];
    expect(welcome.kind).toBe("interstitial");
    expect(welcome.required).toBe(false);
    expect(setupIntro.kind).toBe("interstitial");
    expect(setupIntro.required).toBe(false);
  });

  it("income step is required money kind", () => {
    const income = ONBOARDING_STEPS[getStepIndex("income")];
    expect(income.kind).toBe("money");
    expect(income.required).toBe(true);
  });

  it("savings step is required money kind", () => {
    const savings = ONBOARDING_STEPS[getStepIndex("savings")];
    expect(savings.kind).toBe("money");
    expect(savings.required).toBe(true);
  });

  it("commitments, debts, goals are builder and skippable", () => {
    for (const id of ["commitments", "debts", "goals"] as const) {
      const step = ONBOARDING_STEPS[getStepIndex(id)];
      expect(step.kind).toBe("builder");
      expect(step.skippable).toBe(true);
      expect(step.skipNote).toBeTruthy();
    }
  });

  it("summary is terminal and not required", () => {
    const summary = ONBOARDING_STEPS[getStepIndex("summary")];
    expect(summary.kind).toBe("summary");
    expect(summary.required).toBe(false);
  });
});

describe("isStepComplete", () => {
  it("requires positive income", () => {
    const income = ONBOARDING_STEPS[getStepIndex("income")];
    expect(isStepComplete(income, { ...createDefaultValues(), monthlyIncome: "0" })).toBe(false);
    expect(isStepComplete(income, { ...createDefaultValues(), monthlyIncome: "40000" })).toBe(true);
  });

  it("rejects empty income string", () => {
    const income = ONBOARDING_STEPS[getStepIndex("income")];
    expect(isStepComplete(income, { ...createDefaultValues(), monthlyIncome: "" })).toBe(false);
  });

  it("rejects negative income", () => {
    const income = ONBOARDING_STEPS[getStepIndex("income")];
    expect(isStepComplete(income, { ...createDefaultValues(), monthlyIncome: "-100" })).toBe(false);
  });

  it("requires savings to be a valid non-negative number", () => {
    const savings = ONBOARDING_STEPS[getStepIndex("savings")];
    expect(isStepComplete(savings, { ...createDefaultValues(), currentSavings: "" })).toBe(false);
    expect(isStepComplete(savings, { ...createDefaultValues(), currentSavings: "0" })).toBe(true);
    expect(isStepComplete(savings, { ...createDefaultValues(), currentSavings: "5000" })).toBe(true);
  });

  it("rejects negative savings", () => {
    const savings = ONBOARDING_STEPS[getStepIndex("savings")];
    expect(isStepComplete(savings, { ...createDefaultValues(), currentSavings: "-1" })).toBe(false);
  });

  it("treats optional steps as always complete", () => {
    const intent = ONBOARDING_STEPS[getStepIndex("intent")];
    expect(isStepComplete(intent, createDefaultValues())).toBe(true);
  });

  it("treats interstitial steps as always complete", () => {
    const welcome = ONBOARDING_STEPS[getStepIndex("welcome")];
    expect(isStepComplete(welcome, createDefaultValues())).toBe(true);
  });

  it("treats builder steps as complete regardless of values", () => {
    const commitments = ONBOARDING_STEPS[getStepIndex("commitments")];
    expect(isStepComplete(commitments, createDefaultValues())).toBe(true);
  });
});

describe("getStepIndex", () => {
  it("returns 0 for welcome", () => {
    expect(getStepIndex("welcome")).toBe(0);
  });

  it("returns 13 for summary", () => {
    expect(getStepIndex("summary")).toBe(13);
  });

  it("returns correct index for income", () => {
    const idx = getStepIndex("income");
    expect(ONBOARDING_STEPS[idx].id).toBe("income");
  });

  it("returns -1 for unknown id", () => {
    // @ts-expect-error testing unknown id
    expect(getStepIndex("unknown")).toBe(-1);
  });
});
