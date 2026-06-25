# Conversational Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4-step vault form wizard with a 12-screen conversational onboarding that ends on a real deterministic "Can I buy this?" verdict.

**Architecture:** A typed step-config array drives a single wizard over the reused Midnight Vault shell + primitives. New profile fields (emergency buffer, cooldown preference, intent, pain points) are persisted to `profiles`. The deterministic engine is extended so the chosen buffer and cooldown strictness actually affect the verdict. AI still only explains.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, react-hook-form 7, zod 4, motion 12 (Framer Motion via `motion/react`), Supabase (`@supabase/ssr`), Vitest 4 + @testing-library/react, Playwright.

## Global Constraints

- Default currency is `PHP`.
- The deterministic engine decides the verdict (`SAFE_TO_BUY` / `BUY_WITH_CAUTION` / `WAIT` / `NOT_RECOMMENDED`); risk thresholds stay 75 / 50 / 30. The LLM only explains; it never decides.
- The server derives the user via `requireUserId()`; the client never sends identity.
- Emergency buffer = the chosen amount, clamped to `>= 0`, NOT capped at savings.
- Cooldown multipliers: light `0.5x`, balanced `1.0x`, strict `2.0x`, minimum 1 day.
- Migration is non-destructive; `profiles` RLS is already per-user (`auth.uid() = user_id`).
- Never use an em dash in copy, comments, or code. Use a plain hyphen.
- Unit tests: `npx vitest run <file>`. E2E: Playwright on port 3100, serial + storage reset, onboarding-first (per the project e2e checklist).
- Before writing ANY UI component, invoke the `frontend-design` skill (user global rule), and run the `vercel-react-best-practices` lens on the React work.
- Commit after every task. Do not bypass git hooks (no `--no-verify`).

---

## Phase A - Engine and data foundation

### Task 1: Migration and database types

**Files:**
- Create: `supabase/migrations/20260625000000_onboarding_conversational.sql`
- Modify: `src/types/database.ts` (profiles Row/Insert/Update)

**Interfaces:**
- Produces: four new `profiles` columns - `emergency_buffer numeric`, `cooldown_preference text`, `intent text[]`, `spending_pain_points text[]`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260625000000_onboarding_conversational.sql
alter table public.profiles
  add column if not exists emergency_buffer numeric not null default 0,
  add column if not exists cooldown_preference text not null default 'balanced'
    check (cooldown_preference in ('light', 'balanced', 'strict')),
  add column if not exists intent text[] not null default '{}',
  add column if not exists spending_pain_points text[] not null default '{}';
```

- [ ] **Step 2: Apply locally and confirm columns exist**

Run: `supabase migration up` (or `supabase db reset` if the local stack is fresh)
Expected: applies cleanly; `\d public.profiles` shows the four columns. If the local stack is unavailable, apply via the Supabase MCP `apply_migration` against a throwaway branch.

- [ ] **Step 3: Update `src/types/database.ts`**

In the `profiles` table's `Row` add: `emergency_buffer: number; cooldown_preference: string; intent: string[]; spending_pain_points: string[]`. In `Insert` and `Update` add the same four as optional (`?`) since all have defaults.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260625000000_onboarding_conversational.sql src/types/database.ts
git commit -m "feat(onboarding): add profile columns for buffer, cooldown, intent, pain points"
```

---

### Task 2: Engine - chosen emergency buffer

**Files:**
- Modify: `src/types/finance.ts` (FinancialProfile)
- Modify: `src/lib/calculations/emergency-fund.ts`
- Test: `src/lib/calculations/emergency-fund.test.ts`

**Interfaces:**
- Consumes: `FinancialProfile`.
- Produces: `EmergencyFundInput = { currentSavings: number; emergencyBuffer: number }`; `calculateEmergencyBuffer(input): number` returns `max(0, emergencyBuffer)`; `calculateEmergencyFundProgress(input): number` measured against the buffer.

- [ ] **Step 1: Add fields to `FinancialProfile`**

In `src/types/finance.ts`, add to `FinancialProfile`:

```ts
emergencyBuffer: number;
cooldownPreference: CooldownPreference;
```

And add the type near the other unions:

```ts
export type CooldownPreference = "light" | "balanced" | "strict";
```

Keep `emergencyFundTarget` (back-compat, no longer read by the engine).

- [ ] **Step 2: Write the failing tests**

Replace the body of `src/lib/calculations/emergency-fund.test.ts` (or add these cases):

```ts
import { describe, expect, it } from "vitest";
import {
  calculateEmergencyBuffer,
  calculateEmergencyFundProgress,
} from "./emergency-fund";

describe("calculateEmergencyBuffer", () => {
  it("returns the chosen buffer", () => {
    expect(calculateEmergencyBuffer({ currentSavings: 8000, emergencyBuffer: 10000 })).toBe(10000);
  });

  it("does not cap the buffer at current savings", () => {
    expect(calculateEmergencyBuffer({ currentSavings: 3000, emergencyBuffer: 20000 })).toBe(20000);
  });

  it("clamps a negative buffer to zero", () => {
    expect(calculateEmergencyBuffer({ currentSavings: 5000, emergencyBuffer: -100 })).toBe(0);
  });
});

describe("calculateEmergencyFundProgress", () => {
  it("is zero when the buffer is zero", () => {
    expect(calculateEmergencyFundProgress({ currentSavings: 5000, emergencyBuffer: 0 })).toBe(0);
  });

  it("is the savings-to-buffer ratio, capped at 100", () => {
    expect(calculateEmergencyFundProgress({ currentSavings: 5000, emergencyBuffer: 10000 })).toBe(50);
    expect(calculateEmergencyFundProgress({ currentSavings: 12000, emergencyBuffer: 10000 })).toBe(100);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/calculations/emergency-fund.test.ts`
Expected: FAIL (current impl reads `emergencyFundTarget`).

- [ ] **Step 4: Rewrite `src/lib/calculations/emergency-fund.ts`**

```ts
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export interface EmergencyFundInput {
  currentSavings: number;
  emergencyBuffer: number;
}

export function calculateEmergencyFundProgress(input: EmergencyFundInput): number {
  if (input.emergencyBuffer <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((input.currentSavings / input.emergencyBuffer) * 100));
}

export function calculateEmergencyBuffer(input: EmergencyFundInput): number {
  return clamp(input.emergencyBuffer, 0, Number.MAX_SAFE_INTEGER);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/calculations/emergency-fund.test.ts`
Expected: PASS. Then `npm run typecheck` - fix any `FinancialProfile` construction sites that now miss `emergencyBuffer` / `cooldownPreference` (sample/mock data in tests). Set them explicitly.

- [ ] **Step 6: Commit**

```bash
git add src/types/finance.ts src/lib/calculations/emergency-fund.ts src/lib/calculations/emergency-fund.test.ts
git commit -m "feat(engine): use chosen emergency buffer instead of 0.2x target"
```

---

### Task 3: Engine - cooldown strictness

**Files:**
- Modify: `src/lib/calculations/cooldown.ts`
- Modify: `src/lib/calculations/purchase-decision.ts:239-243`
- Test: `src/lib/calculations/cooldown.test.ts`

**Interfaces:**
- Consumes: `CooldownPreference`, `FinancialProfile.cooldownPreference`.
- Produces: `calculateCooldownDays({ amount, preference }): number` applying the strictness multiplier.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/calculations/cooldown.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateCooldownDays, getCooldownDays } from "./cooldown";

describe("calculateCooldownDays", () => {
  it("defaults to balanced (1x the price tier)", () => {
    expect(calculateCooldownDays({ amount: 15000 })).toBe(getCooldownDays(15000)); // 7
  });

  it("halves the cooldown on light, with a 1-day floor", () => {
    expect(calculateCooldownDays({ amount: 15000, preference: "light" })).toBe(4); // round(7*0.5)
    expect(calculateCooldownDays({ amount: 1000, preference: "light" })).toBe(1); // floor at 1
  });

  it("doubles the cooldown on strict", () => {
    expect(calculateCooldownDays({ amount: 15000, preference: "strict" })).toBe(14); // 7*2
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/calculations/cooldown.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `src/lib/calculations/cooldown.ts`**

```ts
import type { CooldownPreference, PurchaseUrgency } from "@/types/finance";

export function getCooldownDays(price: number): number {
  if (price < 2_000) return 1;
  if (price < 10_000) return 3;
  if (price < 50_000) return 7;
  return 30;
}

const STRICTNESS_MULTIPLIER: Record<CooldownPreference, number> = {
  light: 0.5,
  balanced: 1,
  strict: 2,
};

export function calculateCooldownDays({
  amount,
  preference = "balanced",
}: {
  amount: number;
  preference?: CooldownPreference;
  safeToSpend?: number; // accepted for back-compat, ignored
  urgency?: PurchaseUrgency; // accepted for back-compat, ignored
}): number {
  const base = getCooldownDays(amount);
  return Math.max(1, Math.round(base * STRICTNESS_MULTIPLIER[preference]));
}
```

- [ ] **Step 4: Wire the preference through `purchase-decision.ts`**

Change the cooldown call (around line 239) to:

```ts
const cooldownDays = calculateCooldownDays({
  amount: purchase.amount,
  preference: snapshot.profile.cooldownPreference,
});
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/lib/calculations/cooldown.test.ts && npm run typecheck`
Expected: PASS. Fix any `FinancialSnapshot`/`FinancialProfile` test fixtures that now need `cooldownPreference`.

- [ ] **Step 6: Run the full calculations suite to catch regressions**

Run: `npx vitest run src/lib/calculations`
Expected: PASS (update any `purchase-decision.test.ts` cooldown expectations to the new values).

- [ ] **Step 7: Commit**

```bash
git add src/lib/calculations/cooldown.ts src/lib/calculations/cooldown.test.ts src/lib/calculations/purchase-decision.ts
git commit -m "feat(engine): scale cooldown days by strictness preference"
```

---

### Task 4: Schema - profile fields

**Files:**
- Modify: `src/lib/schemas/finance.ts:70-81`
- Test: `src/lib/schemas/finance.test.ts`

**Interfaces:**
- Produces: `financialProfileSchema` accepting `emergencyBuffer`, `cooldownPreference`, `intent`, `spendingPainPoints`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/schemas/finance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { financialProfileSchema } from "./finance";

const base = {
  currency: "PHP",
  monthlyIncome: 40000,
  currentSavings: 20000,
  emergencyBuffer: 10000,
  cooldownPreference: "strict",
  intent: ["stop_impulse"],
  spendingPainPoints: ["only_check_balance"],
  payFrequency: "monthly",
  estimatedVariableExpenses: 8000,
};

describe("financialProfileSchema", () => {
  it("parses the new fields", () => {
    const parsed = financialProfileSchema.parse(base);
    expect(parsed.emergencyBuffer).toBe(10000);
    expect(parsed.cooldownPreference).toBe("strict");
    expect(parsed.intent).toEqual(["stop_impulse"]);
  });

  it("defaults cooldownPreference to balanced and arrays to empty", () => {
    const { emergencyBuffer: _b, cooldownPreference: _c, intent: _i, spendingPainPoints: _p, ...rest } = base;
    const parsed = financialProfileSchema.parse({ ...rest, emergencyBuffer: 0 });
    expect(parsed.cooldownPreference).toBe("balanced");
    expect(parsed.intent).toEqual([]);
    expect(parsed.spendingPainPoints).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/schemas/finance.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `financialProfileSchema`**

Replace the `emergencyFundTarget` line and extend the object:

```ts
export const financialProfileSchema = z.object({
  currency: z.enum(["PHP", "USD", "EUR", "JPY", "SGD"]).default("PHP"),
  monthlyIncome: money,
  currentSavings: money,
  emergencyBuffer: money.default(0),
  cooldownPreference: z.enum(["light", "balanced", "strict"]).default("balanced"),
  intent: z.array(z.string().min(1)).default([]),
  spendingPainPoints: z.array(z.string().min(1)).default([]),
  fullName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120, "Keep the name under 120 characters.").optional()
  ),
  payFrequency: payFrequencySchema,
  estimatedVariableExpenses: money.default(0),
});
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/schemas/finance.test.ts && npm run typecheck`
Expected: PASS. Fix `FinancialProfileInput` consumers if typecheck flags the dropped `emergencyFundTarget`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas/finance.ts src/lib/schemas/finance.test.ts
git commit -m "feat(onboarding): extend profile schema with buffer, cooldown, intent, pain points"
```

---

### Task 5: Save action - persist new fields

**Files:**
- Modify: `src/features/financial-profile/api/save-financial-profile.ts`
- Create: `src/features/financial-profile/api/to-profile-row.ts`
- Test: `src/features/financial-profile/api/to-profile-row.test.ts`

**Interfaces:**
- Consumes: `FinancialProfileInput` (from `financialProfileSchema`).
- Produces: `toProfileRow(userId: string, profile: FinancialProfileInput): TablesInsert<"profiles">`.

- [ ] **Step 1: Write the failing test**

```ts
// to-profile-row.test.ts
import { describe, expect, it } from "vitest";
import { toProfileRow } from "./to-profile-row";

describe("toProfileRow", () => {
  it("maps onboarding profile fields to db columns with server userId", () => {
    const row = toProfileRow("user-123", {
      currency: "PHP",
      monthlyIncome: 40000,
      currentSavings: 20000,
      emergencyBuffer: 10000,
      cooldownPreference: "strict",
      intent: ["stop_impulse"],
      spendingPainPoints: ["forget_bills"],
      payFrequency: "monthly",
      estimatedVariableExpenses: 8000,
      fullName: "Ada",
    });

    expect(row).toMatchObject({
      user_id: "user-123",
      emergency_buffer: 10000,
      cooldown_preference: "strict",
      intent: ["stop_impulse"],
      spending_pain_points: ["forget_bills"],
      emergency_fund_target: 0,
      full_name: "Ada",
    });
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/financial-profile/api/to-profile-row.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Create `to-profile-row.ts`**

```ts
import type { FinancialProfileInput } from "@/lib/schemas/finance";
import type { TablesInsert } from "@/types/database";

export function toProfileRow(
  userId: string,
  profile: FinancialProfileInput
): TablesInsert<"profiles"> {
  return {
    user_id: userId,
    currency: profile.currency,
    monthly_income: profile.monthlyIncome,
    current_savings: profile.currentSavings,
    emergency_buffer: profile.emergencyBuffer,
    cooldown_preference: profile.cooldownPreference,
    intent: profile.intent,
    spending_pain_points: profile.spendingPainPoints,
    emergency_fund_target: 0, // deprecated, kept for back-compat
    full_name: profile.fullName?.trim() || null,
    pay_frequency: profile.payFrequency,
    estimated_variable_expenses: profile.estimatedVariableExpenses,
  };
}
```

(If `TablesInsert` is not exported from `database.ts`, use the existing helper type pattern there, or `Database["public"]["Tables"]["profiles"]["Insert"]`.)

- [ ] **Step 4: Use it in the action**

In `save-financial-profile.ts`, replace the inline `.upsert({ ... })` object with `toProfileRow(userId, profile)`:

```ts
const profileResult = await supabase
  .from("profiles")
  .upsert(toProfileRow(userId, profile), { onConflict: "user_id" });
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/features/financial-profile/api/to-profile-row.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/financial-profile/api/to-profile-row.ts src/features/financial-profile/api/to-profile-row.test.ts src/features/financial-profile/api/save-financial-profile.ts
git commit -m "feat(onboarding): persist buffer, cooldown, intent, pain points on save"
```

---

## Phase B - Onboarding form model

### Task 6: Form values, payload, and snapshot builders

**Files:**
- Create: `src/features/onboarding/conversational/lib/onboarding-form.ts`
- Test: `src/features/onboarding/conversational/lib/onboarding-form.test.ts`

**Interfaces:**
- Produces:
  - `OnboardingFormValues` (extended shape with string money fields + `intent`, `spendingPainPoints`, `cooldownPreference`).
  - `createDefaultValues(): OnboardingFormValues`.
  - `buildOnboardingPayload(values): { profile, expenses, debts, goals }` (matches the `setupSchema` in `save-financial-profile.ts`).
  - `buildSnapshotFromValues(values): FinancialSnapshot` (for the first-check and summary).

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  buildOnboardingPayload,
  buildSnapshotFromValues,
  createDefaultValues,
} from "./onboarding-form";

describe("buildOnboardingPayload", () => {
  it("drops blank rows and carries the new fields", () => {
    const values = {
      ...createDefaultValues(),
      currency: "PHP" as const,
      monthlyIncome: "40000",
      currentSavings: "20000",
      emergencyBuffer: "10000",
      cooldownPreference: "strict" as const,
      intent: ["stop_impulse"],
      spendingPainPoints: ["forget_bills"],
      expenses: [
        { label: "Rent", amount: "12000", dueDay: "1", isRecurring: true },
        { label: "", amount: "", dueDay: "", isRecurring: true },
      ],
    };

    const payload = buildOnboardingPayload(values);
    expect(payload.profile.emergencyBuffer).toBe(10000);
    expect(payload.profile.cooldownPreference).toBe("strict");
    expect(payload.expenses).toHaveLength(1);
  });
});

describe("buildSnapshotFromValues", () => {
  it("produces a numeric FinancialSnapshot", () => {
    const snapshot = buildSnapshotFromValues({
      ...createDefaultValues(),
      monthlyIncome: "40000",
      currentSavings: "20000",
      emergencyBuffer: "10000",
      cooldownPreference: "balanced",
    });
    expect(snapshot.profile.currentSavings).toBe(20000);
    expect(snapshot.profile.emergencyBuffer).toBe(10000);
    expect(snapshot.expenses).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/lib/onboarding-form.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `onboarding-form.ts`**

Define `OnboardingFormValues`, `ExpenseRow`, `DebtRow`, `GoalRow` (string-valued, mirror `vault/lib/onboarding-form.ts`). Add `emergencyBuffer: string`, `intent: string[]`, `spendingPainPoints: string[]`, `cooldownPreference: CooldownPreference`; remove `emergencyFundTarget`. `createDefaultValues()` returns empty strings, `cooldownPreference: "balanced"`, empty arrays. `buildOnboardingPayload` parses numbers, filters blank rows (reuse the existing blank-filter logic), and returns `{ profile, expenses, debts, goals }`. `buildSnapshotFromValues` maps the same data into `FinancialSnapshot` (profile numbers + `id`-stamped rows; use `crypto.randomUUID()` for row ids).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/lib/onboarding-form.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/lib/
git commit -m "feat(onboarding): conversational form values, payload, and snapshot builders"
```

---

## Phase C - Step configuration

### Task 7: Step config and validation

**Files:**
- Create: `src/features/onboarding/conversational/config/onboarding-steps.ts`
- Test: `src/features/onboarding/conversational/config/onboarding-steps.test.ts`

**Interfaces:**
- Produces: `OnboardingStep`, `StepKind`, `OnboardingStepId`, `ONBOARDING_STEPS: OnboardingStep[]`, `isStepComplete(step, values): boolean`, `getStepIndex(id): number`.

- [ ] **Step 1: Write failing tests**

```ts
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
});

describe("isStepComplete", () => {
  it("requires positive income", () => {
    const income = ONBOARDING_STEPS[getStepIndex("income")];
    expect(isStepComplete(income, { ...createDefaultValues(), monthlyIncome: "0" })).toBe(false);
    expect(isStepComplete(income, { ...createDefaultValues(), monthlyIncome: "40000" })).toBe(true);
  });

  it("treats optional steps as always complete", () => {
    const intent = ONBOARDING_STEPS[getStepIndex("intent")];
    expect(isStepComplete(intent, createDefaultValues())).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/config/onboarding-steps.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the config**

Define the types and the 14-entry array (ids from the spec section 4: `welcome, intent, pain-points, setup-intro, income, savings, variable-spend, buffer, commitments, debts, goals, cooldown, first-check, summary`), each with `kind`, `required`, `skippable`, optional `skipNote`. `isStepComplete` returns `true` unless `required` and the relevant value is invalid (`income`: number > 0; `savings`: non-empty number `>= 0`). `getStepIndex` finds by id.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/config/onboarding-steps.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/config/
git commit -m "feat(onboarding): typed step config with completion rules"
```

---

## Phase D - Reusable primitives

> Every task in Phases D-I: FIRST invoke the `frontend-design` skill, then reuse the vault primitives in `src/features/onboarding/vault/components/primitives/` and tokens in `src/features/onboarding/vault/vault.css`. Components are client components (`"use client"`). Tests use `@testing-library/react` + `@testing-library/user-event`.

### Task 8: SelectableCard and MoneyInput

**Files:**
- Create: `src/features/onboarding/conversational/components/selectable-card.tsx`
- Create: `src/features/onboarding/conversational/components/money-input.tsx`
- Test: `src/features/onboarding/conversational/components/selectable-card.test.tsx`
- Test: `src/features/onboarding/conversational/components/money-input.test.tsx`

**Interfaces:**
- Produces:
  - `SelectableCard(props: { label: string; description?: string; selected: boolean; onToggle: () => void; icon?: ReactNode })` - renders a `<button role="checkbox" aria-checked={selected}>`.
  - `MoneyInput(props: { id: string; label: string; value: string; onChange: (v: string) => void; currency: CurrencyCode; autoFocus?: boolean })` - currency prefix, `inputMode="decimal"`.

- [ ] **Step 1: Write failing tests**

```tsx
// selectable-card.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SelectableCard } from "./selectable-card";

it("reflects selected state and toggles on click", async () => {
  const onToggle = vi.fn();
  render(<SelectableCard label="Stop impulse purchases" selected={false} onToggle={onToggle} />);
  const card = screen.getByRole("checkbox", { name: /stop impulse/i });
  expect(card).toHaveAttribute("aria-checked", "false");
  await userEvent.click(card);
  expect(onToggle).toHaveBeenCalledOnce();
});
```

```tsx
// money-input.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MoneyInput } from "./money-input";

it("shows the currency and emits typed value", async () => {
  const onChange = vi.fn();
  render(<MoneyInput id="income" label="Monthly income" value="" onChange={onChange} currency="PHP" />);
  expect(screen.getByText("PHP")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Monthly income"), "5");
  expect(onChange).toHaveBeenCalledWith("5");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/components/selectable-card.test.tsx src/features/onboarding/conversational/components/money-input.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement both**

`SelectableCard`: a `<button type="button" role="checkbox" aria-checked={selected} onClick={onToggle}>` styled with vault tokens (`--vault-surface`, `--vault-border`, accent border when selected), label + optional description + optional icon, visible focus ring. `MoneyInput`: a `VaultField` wrapper containing a currency badge and a numeric `<input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}>`; pass through `id`/`label`/`autoFocus`. Pixel styling per frontend-design.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/components/selectable-card.test.tsx src/features/onboarding/conversational/components/money-input.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/components/selectable-card.tsx src/features/onboarding/conversational/components/money-input.tsx src/features/onboarding/conversational/components/selectable-card.test.tsx src/features/onboarding/conversational/components/money-input.test.tsx
git commit -m "feat(onboarding): SelectableCard and MoneyInput primitives"
```

---

### Task 9: ConversationalPrompt, MicroResponse, ProgressPath

**Files:**
- Create: `conversational/components/conversational-prompt.tsx`
- Create: `conversational/components/micro-response.tsx`
- Create: `conversational/components/progress-path.tsx`
- Test: `conversational/components/micro-response.test.tsx`
- Test: `conversational/components/progress-path.test.tsx`

(Path prefix: `src/features/onboarding/`.)

**Interfaces:**
- Produces:
  - `ConversationalPrompt(props: { eyebrow?: string; headline: string; subtext?: string; why?: string })`.
  - `MicroResponse(props: { show: boolean; children: ReactNode })` - animates in with `motion/react`, respects reduced motion, `role="status"`.
  - `ProgressPath(props: { steps: { id: string; label: string }[]; currentIndex: number })`.

- [ ] **Step 1: Write failing tests**

```tsx
// micro-response.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MicroResponse } from "./micro-response";

it("renders its message when shown", () => {
  render(<MicroResponse show>Got it. We will set up SpendGuard around pausing before you spend.</MicroResponse>);
  expect(screen.getByRole("status")).toHaveTextContent(/pausing before you spend/i);
});

it("renders nothing when hidden", () => {
  const { container } = render(<MicroResponse show={false}>hidden</MicroResponse>);
  expect(container).toBeEmptyDOMElement();
});
```

```tsx
// progress-path.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProgressPath } from "./progress-path";

it("marks the current step", () => {
  render(<ProgressPath steps={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} currentIndex={1} />);
  expect(screen.getByText("B").closest("[data-active]")).toHaveAttribute("data-active", "true");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/components/micro-response.test.tsx src/features/onboarding/conversational/components/progress-path.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`ConversationalPrompt`: stacked eyebrow / headline (`--vault-text`) / subtext (`--vault-muted`) / a small "why we ask" line. `MicroResponse`: returns `null` when `!show`; otherwise a `motion.p role="status"` fade/slide that uses the existing reduced-motion approach from `guardian-hero-player.tsx`. `ProgressPath`: adapt `vault-stepper.tsx`; render each step with `data-active={index === currentIndex}` and `data-complete={index < currentIndex}`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/components/micro-response.test.tsx src/features/onboarding/conversational/components/progress-path.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/components/conversational-prompt.tsx src/features/onboarding/conversational/components/micro-response.tsx src/features/onboarding/conversational/components/progress-path.tsx src/features/onboarding/conversational/components/micro-response.test.tsx src/features/onboarding/conversational/components/progress-path.test.tsx
git commit -m "feat(onboarding): prompt, micro-response, and progress-path components"
```

---

## Phase E - Builders

### Task 10: CommitmentBuilder, DebtBuilder, GoalBuilder

**Files:**
- Create: `conversational/components/commitment-builder.tsx`
- Create: `conversational/components/debt-builder.tsx`
- Create: `conversational/components/goal-builder.tsx`
- Test: `conversational/components/commitment-builder.test.tsx`

**Interfaces:**
- Consumes: react-hook-form `control`, the `vault` `RepeatableRow`/`EmptyState` primitives, `SelectableCard` (example chips).
- Produces:
  - `CommitmentBuilder(props: { control: Control<OnboardingFormValues>; examples: string[] })` over `useFieldArray({ name: "expenses" })`.
  - `DebtBuilder(props: { control })` over `debts`.
  - `GoalBuilder(props: { control })` over `goals`.

- [ ] **Step 1: Write the failing test (CommitmentBuilder)**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { expect, it } from "vitest";
import { CommitmentBuilder } from "./commitment-builder";
import { createDefaultValues } from "../lib/onboarding-form";

function Harness() {
  const { control } = useForm({ defaultValues: createDefaultValues() });
  return <CommitmentBuilder control={control} examples={["Rent", "Internet"]} />;
}

it("adds a commitment row from an example chip", async () => {
  render(<Harness />);
  await userEvent.click(screen.getByRole("button", { name: "Rent" }));
  expect(screen.getByDisplayValue("Rent")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/components/commitment-builder.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the three builders**

Each uses `useFieldArray`. Example chips (`SelectableCard` in single-add mode) append a row prefilled with the chip label. Rows render with `RepeatableRow` (remove control) and vault inputs for the row fields - CommitmentBuilder: label, amount, dueDay, recurring toggle; DebtBuilder: label, outstandingBalance, minimumPayment, dueDay; GoalBuilder: label, targetAmount, savedAmount, optional targetDate. Empty list shows `EmptyState`. No spreadsheet styling - one card per item, generous spacing (frontend-design).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/components/commitment-builder.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/components/commitment-builder.tsx src/features/onboarding/conversational/components/debt-builder.tsx src/features/onboarding/conversational/components/goal-builder.tsx src/features/onboarding/conversational/components/commitment-builder.test.tsx
git commit -m "feat(onboarding): conversational commitment, debt, and goal builders"
```

---

## Phase F - Screen components

> Screens are thin: they compose `ConversationalPrompt` + the relevant primitive/builder and read/write react-hook-form values via `control`/`watch`/`setValue`. Copy comes verbatim from the spec (calm, non-judgmental, no em dash).

### Task 11: Welcome, SetupIntro, Intent, PainPoints

**Files:**
- Create: `conversational/components/steps/welcome-step.tsx`
- Create: `conversational/components/steps/setup-intro-step.tsx`
- Create: `conversational/components/steps/intent-step.tsx`
- Create: `conversational/components/steps/pain-points-step.tsx`
- Test: `conversational/components/steps/intent-step.test.tsx`

**Interfaces:**
- Produces:
  - `WelcomeStep(props: { onStart: () => void; onExplore: () => void })`.
  - `SetupIntroStep(props: { onContinue: () => void })`.
  - `IntentStep(props: { value: string[]; onChange: (v: string[]) => void })`.
  - `PainPointsStep(props: { value: string[]; onChange: (v: string[]) => void })`.
- Constants: `INTENT_OPTIONS`, `PAIN_POINT_OPTIONS` (`{ id, label }[]`), exported for reuse and tests.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { IntentStep } from "./intent-step";

it("toggles an intent selection", async () => {
  const onChange = vi.fn();
  render(<IntentStep value={[]} onChange={onChange} />);
  await userEvent.click(screen.getByRole("checkbox", { name: /stop impulse purchases/i }));
  expect(onChange).toHaveBeenCalledWith(["stop_impulse"]);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/components/steps/intent-step.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the four screens**

`WelcomeStep`: headline "Before you buy, ask SpendGuard.", subtext per spec, primary `VaultButton` -> `onStart`, secondary ghost -> `onExplore`, Guardian hero in the shell (handled by the wizard). `SetupIntroStep`: the "money already spoken for" interstitial + continue. `IntentStep` / `PainPointsStep`: a grid of `SelectableCard`s over the option constants; multi-select toggles the id in/out of `value`. Use the spec's six options each.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/components/steps/intent-step.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/components/steps/welcome-step.tsx src/features/onboarding/conversational/components/steps/setup-intro-step.tsx src/features/onboarding/conversational/components/steps/intent-step.tsx src/features/onboarding/conversational/components/steps/pain-points-step.tsx src/features/onboarding/conversational/components/steps/intent-step.test.tsx
git commit -m "feat(onboarding): welcome, setup-intro, intent, and pain-point screens"
```

---

### Task 12: Income, Savings, VariableSpend, Buffer

**Files:**
- Create: `conversational/components/steps/income-step.tsx` (income + currency)
- Create: `conversational/components/steps/savings-step.tsx`
- Create: `conversational/components/steps/variable-spend-step.tsx`
- Create: `conversational/components/steps/buffer-step.tsx`
- Test: `conversational/components/steps/buffer-step.test.tsx`

**Interfaces:**
- Produces:
  - `IncomeStep(props: { control })` - `MoneyInput` for `monthlyIncome` + `VaultSelect` for `currency` (default PHP).
  - `SavingsStep(props: { control })`, `VariableSpendStep(props: { control })` - single `MoneyInput`.
  - `BufferStep(props: { value: string; onChange: (v: string) => void })` - preset cards `["0","5000","10000","20000"]` + custom MoneyInput.
- Constant: `BUFFER_PRESETS`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { BufferStep } from "./buffer-step";

it("selects a preset buffer", async () => {
  const onChange = vi.fn();
  render(<BufferStep value="" onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: /10,000/ }));
  expect(onChange).toHaveBeenCalledWith("10000");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/components/steps/buffer-step.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the four screens**

Money screens compose `ConversationalPrompt` + `MoneyInput` bound via RHF `Controller`. Income screen adds the currency `VaultSelect`. Buffer screen renders `BUFFER_PRESETS` as `SelectableCard`s (selected when `value` matches) plus a "Custom amount" `MoneyInput`; "Not now" maps to `"0"`. Spec copy for each.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/components/steps/buffer-step.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/components/steps/income-step.tsx src/features/onboarding/conversational/components/steps/savings-step.tsx src/features/onboarding/conversational/components/steps/variable-spend-step.tsx src/features/onboarding/conversational/components/steps/buffer-step.tsx src/features/onboarding/conversational/components/steps/buffer-step.test.tsx
git commit -m "feat(onboarding): income, savings, variable-spend, and buffer screens"
```

---

### Task 13: Commitments, Debts, Goals, Cooldown

**Files:**
- Create: `conversational/components/steps/commitments-step.tsx`
- Create: `conversational/components/steps/debts-step.tsx`
- Create: `conversational/components/steps/goals-step.tsx`
- Create: `conversational/components/cooldown-selector.tsx`
- Create: `conversational/components/steps/cooldown-step.tsx`
- Test: `conversational/components/cooldown-selector.test.tsx`

**Interfaces:**
- Produces:
  - `CommitmentsStep` / `DebtsStep` / `GoalsStep` `(props: { control })` - wrap the builders with the spec prompt + example chips.
  - `CooldownSelector(props: { value: CooldownPreference; onChange: (v: CooldownPreference) => void })`.
  - `CooldownStep(props: { value: CooldownPreference; onChange })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { CooldownSelector } from "./cooldown-selector";

it("selects strict", async () => {
  const onChange = vi.fn();
  render(<CooldownSelector value="balanced" onChange={onChange} />);
  await userEvent.click(screen.getByRole("radio", { name: /strict pause/i }));
  expect(onChange).toHaveBeenCalledWith("strict");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/components/cooldown-selector.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`CooldownSelector`: a `radiogroup` of three `SelectableCard`-style options (light / balanced / strict) with the spec descriptions and the cooldown explanation. Steps compose `ConversationalPrompt` + builder/selector; commitments/debts/goals pass spec example chips and show the per-add micro-response via the wizard.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/components/cooldown-selector.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/components/steps/commitments-step.tsx src/features/onboarding/conversational/components/steps/debts-step.tsx src/features/onboarding/conversational/components/steps/goals-step.tsx src/features/onboarding/conversational/components/cooldown-selector.tsx src/features/onboarding/conversational/components/steps/cooldown-step.tsx src/features/onboarding/conversational/components/cooldown-selector.test.tsx
git commit -m "feat(onboarding): commitments, debts, goals, and cooldown screens"
```

---

## Phase G - Payoff

### Task 14: FirstPurchaseCheck and OnboardingSummary

**Files:**
- Create: `conversational/components/first-purchase-check.tsx`
- Create: `conversational/components/onboarding-summary.tsx`
- Test: `conversational/components/first-purchase-check.test.tsx`

**Interfaces:**
- Consumes: `buildSnapshotFromValues`, `calculatePurchaseDecision`, the existing `savePurchaseCheckAction` (read `src/features/purchase-checker/api/save-purchase-check.ts` for its exact input).
- Produces:
  - `FirstPurchaseCheck(props: { values: OnboardingFormValues; onDone: () => void; onSkip: () => void })`.
  - `OnboardingSummary(props: { values: OnboardingFormValues; onEnterApp: () => void })`.
  - Helper `runFirstCheck(values, purchase): PurchaseDecisionResult` (pure, testable).

- [ ] **Step 1: Write the failing test**

```tsx
import { expect, it } from "vitest";
import { runFirstCheck } from "./first-purchase-check";
import { createDefaultValues } from "../lib/onboarding-form";

it("returns a deterministic verdict for a sample purchase", () => {
  const values = { ...createDefaultValues(), monthlyIncome: "40000", currentSavings: "5000", emergencyBuffer: "10000" };
  const result = runFirstCheck(values, { itemName: "Headphones", amount: 8000, urgency: "want", paymentMethod: "cash" });
  // safeToSpend 0 (savings 5000 - buffer 10000, floored). +30 over safe, +30 breaks buffer, +10 want = 70 -> WAIT
  expect(result.decision).toBe("WAIT");
  expect(result.safeToSpend).toBe(0);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/components/first-purchase-check.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`runFirstCheck` builds the snapshot via `buildSnapshotFromValues`, calls `calculatePurchaseDecision(snapshot, purchase)`. `FirstPurchaseCheck`: item name + price + category + optional note inputs (`paymentMethod` defaults to `"cash"`, `urgency` to `"want"`), a disabled "Voice (coming soon)" chip, a "Try a sample" button that fills a sample item, and "Check if I can buy this" that runs `runFirstCheck`, renders the verdict + cooldown + reasons, and persists via `savePurchaseCheckAction`. `onSkip` jumps to summary. `OnboardingSummary`: reads the snapshot, shows protected buffer / total bills / debts considered / goals protected / cooldown mode / `calculateSafeToSpend(snapshot)`, and a primary CTA `onEnterApp`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/components/first-purchase-check.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/components/first-purchase-check.tsx src/features/onboarding/conversational/components/onboarding-summary.tsx src/features/onboarding/conversational/components/first-purchase-check.test.tsx
git commit -m "feat(onboarding): deterministic first-purchase check and summary"
```

---

## Phase H - Orchestrator and route

### Task 15: Onboarding wizard

**Files:**
- Create: `conversational/components/onboarding-wizard.tsx`
- Test: `conversational/components/onboarding-wizard.test.tsx`

**Interfaces:**
- Consumes: everything above + `OnboardingShell`, `GuardianHeroPlayer`, `saveFinancialProfileAction`.
- Produces: `OnboardingWizard()` (default export) - the client orchestrator.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

vi.mock("@/features/financial-profile/api/save-financial-profile", () => ({
  saveFinancialProfileAction: vi.fn(async () => ({ ok: true, data: null })),
}));

import OnboardingWizard from "./onboarding-wizard";

it("starts on welcome and advances to the intent screen", async () => {
  render(<OnboardingWizard />);
  expect(
    screen.getByRole("heading", { name: /before you buy, ask spendguard/i })
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /set up my guardrail/i }));
  expect(
    screen.getByRole("heading", { name: /what do you want spendguard to help/i })
  ).toBeInTheDocument();
});
```

(The income gate itself is covered by `isStepComplete` in Task 7; this test just proves the wizard renders and navigates. Add a fuller walk later if useful.)

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/components/onboarding-wizard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the orchestrator**

`useForm({ defaultValues: createDefaultValues() })`. Track `stepIndex` state. Render the step component for `ONBOARDING_STEPS[stepIndex]` inside `OnboardingShell` (left: `GuardianHeroPlayer`; right: `ProgressPath` + step body + footer). Footer Continue is disabled when `!isStepComplete(step, values)`; skippable steps show a "Skip" link with the `skipNote`. After the `cooldown` step, Continue calls `saveFinancialProfileAction(buildOnboardingPayload(values))`; on `ok`, advance to `first-check`. `first-check` `onDone`/`onSkip` -> `summary`. `summary` `onEnterApp` -> `router.replace("/")`. `WelcomeStep` `onExplore` -> `router.push("/explore")` (matches the gated route in Task 18). Show `MicroResponse` after answers per step. Memoize handlers; keep inputs uncontrolled-via-RHF to avoid wizard-wide re-renders (the `perf` lesson from the vault wizard).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/components/onboarding-wizard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/components/onboarding-wizard.tsx src/features/onboarding/conversational/components/onboarding-wizard.test.tsx
git commit -m "feat(onboarding): conversational wizard orchestrator"
```

---

### Task 16: Mount the new wizard, retire the vault flow

**Files:**
- Modify: `src/app/(onboarding)/onboarding/page.tsx`
- Delete: `src/features/onboarding/vault/components/onboarding-wizard.tsx`, `step-income-savings.tsx`, `step-commitments.tsx`, `step-goals.tsx`, `step-review.tsx`, `src/features/onboarding/vault/lib/onboarding-form.ts` (+ its test)

**Interfaces:**
- Consumes: `OnboardingWizard` from the conversational feature.

- [ ] **Step 1: Point the page at the new wizard**

```tsx
import OnboardingWizard from "@/features/onboarding/conversational/components/onboarding-wizard";

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
```

- [ ] **Step 2: Delete the superseded vault flow files**

Remove the five old step/wizard components and the old `vault/lib/onboarding-form.ts` + test. Keep `vault/components/primitives/*`, `onboarding-shell.tsx`, `guardian-hero*`, `vault-stepper.tsx`, and `vault.css` (still reused).

- [ ] **Step 3: Typecheck, lint, unit suite**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: PASS. Fix any imports orphaned by the deletions.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(onboarding): mount conversational wizard, retire vault form steps"
```

---

## Phase I - Explore sandbox and gate

### Task 17: Sample snapshot and ExploreSandbox

**Files:**
- Create: `conversational/lib/sample-snapshot.ts`
- Create: `conversational/components/explore-sandbox.tsx`
- Test: `conversational/lib/sample-snapshot.test.ts`

**Interfaces:**
- Produces: `SAMPLE_SNAPSHOT: FinancialSnapshot`; `ExploreSandbox()` client component.

- [ ] **Step 1: Write the failing test**

```ts
import { expect, it } from "vitest";
import { SAMPLE_SNAPSHOT } from "./sample-snapshot";
import { calculatePurchaseDecision } from "@/lib/calculations/purchase-decision";

it("runs the real engine on sample data", () => {
  const result = calculatePurchaseDecision(SAMPLE_SNAPSHOT, {
    itemName: "Sneakers", amount: 3000, urgency: "want", paymentMethod: "cash",
  });
  expect(["SAFE_TO_BUY", "BUY_WITH_CAUTION", "WAIT", "NOT_RECOMMENDED"]).toContain(result.decision);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/onboarding/conversational/lib/sample-snapshot.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`SAMPLE_SNAPSHOT`: a realistic PHP profile (e.g. income 45000, savings 30000, emergencyBuffer 10000, cooldownPreference "balanced"), a couple of expenses, one debt, one goal. `ExploreSandbox`: reuses the first-check UI in read-only mode against `SAMPLE_SNAPSHOT` (no save, no completion), with a banner "This is sample data" and a prominent `VaultButton` "Set up my real guardrail" -> `router.push("/onboarding")`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/onboarding/conversational/lib/sample-snapshot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/conversational/lib/sample-snapshot.ts src/features/onboarding/conversational/components/explore-sandbox.tsx src/features/onboarding/conversational/lib/sample-snapshot.test.ts
git commit -m "feat(onboarding): sample-data explore sandbox"
```

---

### Task 18: Explore route and gate allowlist

**Files:**
- Create: `src/app/(onboarding)/explore/page.tsx`
- Modify: `src/features/auth/api/auth-routing.ts`
- Test: `src/features/auth/api/auth-routing.test.ts`

**Interfaces:**
- Produces: `/onboarding/explore` reachable by an authenticated, not-yet-onboarded user; all other app routes stay gated.

Note: confirm the public path. The route lives in the `(onboarding)` group; if its URL is `/explore`, allowlist `/explore`. If you nest it under `onboarding/`, allowlist `/onboarding/explore`. Use whichever the folder yields and keep the test in sync.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "./auth-routing";

describe("getAuthRedirect", () => {
  it("lets an un-onboarded user reach the explore sandbox", () => {
    const redirect = getAuthRedirect({ isAuthenticated: true, isOnboarded: false, pathname: "/explore" });
    expect(redirect).toBeNull();
  });

  it("still funnels an un-onboarded user from the app home to onboarding", () => {
    const redirect = getAuthRedirect({ isAuthenticated: true, isOnboarded: false, pathname: "/" });
    expect(redirect).toBe("/onboarding");
  });
});
```

(Match the real `getAuthRedirect` signature; read the file first and adapt the argument shape.)

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/auth/api/auth-routing.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add the explore path to the set of paths an un-onboarded authenticated user may visit (alongside `/onboarding` and auth callbacks) in `getAuthRedirect`. Create `explore/page.tsx` rendering `<ExploreSandbox />`. Verify `src/proxy.ts` consumes `getAuthRedirect`; no separate change needed if the allowlist lives in the routing helper.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/auth/api/auth-routing.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(onboarding)/explore/page.tsx src/features/auth/api/auth-routing.ts src/features/auth/api/auth-routing.test.ts
git commit -m "feat(onboarding): explore route allowed through the onboarding gate"
```

---

## Phase J - End-to-end

### Task 19: Conversational onboarding e2e

**Files:**
- Create: `e2e/onboarding-conversational.spec.ts`
- Delete: `e2e/onboarding-vault.spec.ts`

**Interfaces:**
- Consumes: the live app on port 3100 (per the project Playwright `webServer` config + e2e checklist: bypass portless, reset storage, serial, onboarding-first, wait for remote hydration).

- [ ] **Step 1: Write the spec**

Model it on `e2e/auth-redirect.spec.ts`. Cover, serial:
  1. Happy path - welcome -> set up -> fill income + savings -> pick a buffer preset -> add one commitment -> skip debts/goals -> pick a cooldown -> run a first check -> see a verdict chip -> reach the summary.
  2. Skip path - the minimum required (income + savings) completes onboarding; optional screens skipped.
  3. Explore - "I just want to explore" reaches the sandbox, runs a sample check, and "Set up my real guardrail" returns to onboarding.
  4. Gate - after finishing, visiting `/onboarding` redirects to the app home.
Assert on roles/text, not test ids where avoidable. Each first-check assertion checks that one of the four verdict labels is visible.

- [ ] **Step 2: Run the e2e suite**

Run: `npm run e2e -- onboarding-conversational`
Expected: PASS on port 3100. If it is blocked on `E2E_SUPABASE_*` credentials (known constraint), document the blocked state in the task notes and keep the spec committed.

- [ ] **Step 3: Delete the obsolete vault spec**

Remove `e2e/onboarding-vault.spec.ts` (the 4-step flow it covers no longer exists).

- [ ] **Step 4: Commit**

```bash
git add e2e/onboarding-conversational.spec.ts
git rm e2e/onboarding-vault.spec.ts
git commit -m "test(onboarding): e2e for the conversational flow, retire vault spec"
```

---

## Final verification

- [ ] `npm run test` - full unit suite green.
- [ ] `npm run typecheck` - no type errors.
- [ ] `npm run lint` - clean.
- [ ] `npm run build` - production build succeeds.
- [ ] Manual: walk the flow at `spendguard.localhost`, confirm the first-check verdict matches a hand calculation, and confirm reduced-motion users get the static hero.

---

## Self-review (spec coverage)

- Spec sections 4 (flow) -> Tasks 7, 11-15. Section 5 (data) -> Tasks 1, 4, 5, 6. Section 6 (engine) -> Tasks 2, 3. Section 7 (components) -> Tasks 8-15. Section 8 (sandbox/gate) -> Tasks 17, 18. Section 9 (payoff) -> Task 14. Section 10 (skip/validation) -> Task 7 + wizard (15). Section 13 (testing) -> per-task tests + Task 19. Flags A/B handled in Tasks 6/12 (savings step) and Task 2 (buffer behavior).
- Out-of-scope items (real voice, dashboard, FX) are not given tasks, by design.
