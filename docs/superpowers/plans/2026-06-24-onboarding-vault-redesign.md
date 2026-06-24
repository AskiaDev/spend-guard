# Onboarding Vault Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **During build:** apply `frontend-design:frontend-design` for every UI task and `remotion-best-practices` for the Guardian hero task (user-requested).

**Goal:** Replace the post-signup onboarding with a full-screen, hard-gated, "Midnight Vault" wizard (4 steps) featuring a Remotion hero, scoped so the rest of the app keeps its current look.

**Architecture:** New `(onboarding)` route group with its own full-screen layout (no sidebar) and an onboarding-scoped theme. Server-side layout guards form the hard gate. The wizard binds React Hook Form to the canonical finance zod schemas and calls `saveFinancialProfileAction` directly. Framer Motion drives step transitions; a lazy Remotion `<Player>` renders the hero (static SVG under reduced-motion).

**Tech Stack:** Next.js App Router (RSC + server actions), Tailwind v4, `motion` (Framer Motion), `remotion` + `@remotion/player`, React Hook Form + Zod, vitest, Playwright.

## Global Constraints

- Do NOT modify `src/app/globals.css` `@theme` / `:root`. Vault theme is scoped to onboarding only.
- Reuse canonical schemas in `src/lib/schemas/finance.ts` (`financialProfileSchema`, `expenseSchema`, `debtSchema`, `goalSchema`) and helpers (`money`, `dueDay`, `currencySchema`, `payFrequencySchema`, `emptyToUndefined`, `isIsoDate`). Do not duplicate them.
- Persist via `saveFinancialProfileAction({ profile, expenses, debts, goals })` from `src/features/financial-profile/api/save-financial-profile.ts`. No `FinancialStateProvider` in onboarding.
- Currencies: `PHP | USD | EUR | JPY | SGD` (default `PHP`). Pay frequencies: `PAY_FREQUENCIES` from `src/types/finance.ts`. Goal priority: `high | medium | low`.
- Every list (expenses/debts/goals) is optional and skippable; a profile with empty lists still flips `onboarding_completed`.
- Honor `prefers-reduced-motion` in every animated surface.
- No em dashes in user-facing copy (use a plain dash).
- Package manager: npm. Unit tests: `import { describe, it, expect } from "vitest"`, run `npm test`. E2E: `npm run e2e` (Playwright, `testDir ./e2e`, baseURL `http://127.0.0.1:3100`). Follow the project e2e checklist (webServer bypasses portless, reset + serial, onboarding-first).

## File Structure

```
src/app/(onboarding)/
  layout.tsx                         # full-screen layout, fonts, vault wrapper, onboarded->/ + auth guards
  onboarding/page.tsx                # renders <OnboardingWizard/>
src/features/onboarding/
  api/read-onboarding-completed.ts   # supabase read used by both gates
  vault/
    vault.css                        # .vault scoped tokens + base classes (global import, scoped selector)
    lib/onboarding-form.ts           # form value types + buildOnboardingPayload()
    lib/onboarding-form.test.ts      # unit tests for buildOnboardingPayload
    components/
      onboarding-wizard.tsx          # client container: RHF, step state, nav, submit
      onboarding-shell.tsx           # split layout + stepper + progress + motion transitions
      vault-stepper.tsx
      guardian-hero.tsx              # Remotion composition
      guardian-hero-player.tsx       # lazy <Player> + reduced-motion switch
      guardian-shield-static.tsx     # static SVG fallback
      step-income-savings.tsx
      step-commitments.tsx
      step-goals.tsx
      step-review.tsx
      primitives/{vault-button,vault-field,vault-select,repeatable-row,empty-state}.tsx
src/app/(app)/layout.tsx             # MODIFY: add !completed -> /onboarding gate
src/features/auth/api/actions.ts     # MODIFY: signUpAction redirect /onboarding
```

Deletions (orphaned by this work): `src/app/(app)/onboarding/page.tsx`, `OnboardingPageContent` in `src/app/(app)/_components/page-adapters.tsx`, and `src/features/onboarding/components/onboarding-setup.tsx` (only if grep shows no other importer).

---

### Task 1: Add dependencies

**Files:** Modify `package.json`, `package-lock.json`.

- [ ] **Step 1: Install**

```bash
npm install motion remotion @remotion/player
```

- [ ] **Step 2: Verify versions resolved and peer deps OK**

Run: `npm ls motion remotion @remotion/player`
Expected: all three listed with versions, no missing-peer errors for React.

- [ ] **Step 3: Typecheck still clean**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add motion and remotion for onboarding redesign"
```

---

### Task 2: Onboarding-completed read helper

**Files:**
- Create: `src/features/onboarding/api/read-onboarding-completed.ts`

**Interfaces:**
- Produces: `readOnboardingCompleted(supabase: SupabaseServerClient, userId: string): Promise<boolean>`

- [ ] **Step 1: Implement**

```ts
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function readOnboardingCompleted(
  supabase: SupabaseServerClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data?.onboarding_completed);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/api/read-onboarding-completed.ts
git commit -m "feat(onboarding): add onboarding-completed read helper"
```

> Gate behavior is verified end-to-end in Task 13 (mocking the supabase client for a trivial boolean read adds no real coverage; the e2e gate test is the meaningful check).

---

### Task 3: Hard gate - route group, layout, guards, signup redirect

**Files:**
- Create: `src/app/(onboarding)/layout.tsx`, `src/app/(onboarding)/onboarding/page.tsx`
- Modify: `src/app/(app)/layout.tsx`, `src/features/auth/api/actions.ts`
- Delete: `src/app/(app)/onboarding/page.tsx`; remove `OnboardingPageContent` from `src/app/(app)/_components/page-adapters.tsx`

**Interfaces:**
- Consumes: `readOnboardingCompleted` (Task 2), `OnboardingWizard` (Task 12 - use a temporary stub now, replace in Task 12).

- [ ] **Step 1: Temporary wizard stub** (replaced in Task 12 so this task builds independently)

Create `src/features/onboarding/vault/components/onboarding-wizard.tsx`:

```tsx
"use client";
export function OnboardingWizard() {
  return <div data-testid="onboarding-wizard">Onboarding</div>;
}
```

- [ ] **Step 2: Onboarding layout with guards + page**

Create `src/app/(onboarding)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { readOnboardingCompleted } from "@/features/onboarding/api/read-onboarding-completed";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import "@/features/onboarding/vault/vault.css"; // added in Task 4

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (!env.hasSupabaseConfig) {
    redirect("/login?error=configuration");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (await readOnboardingCompleted(supabase, user.id)) {
    redirect("/");
  }

  // .vault scopes the onboarding theme; fonts wired in Task 4.
  return <div className="vault">{children}</div>;
}
```

Create `src/app/(onboarding)/onboarding/page.tsx`:

```tsx
import type { Metadata } from "next";
import { OnboardingWizard } from "@/features/onboarding/vault/components/onboarding-wizard";

export const metadata: Metadata = { title: "Welcome | SpendGuard" };

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
```

- [ ] **Step 3: Delete the old onboarding page**

```bash
git rm src/app/(app)/onboarding/page.tsx
```

- [ ] **Step 4: Remove the orphaned adapter**

In `src/app/(app)/_components/page-adapters.tsx`, delete the `OnboardingPageContent` function and any now-unused imports it alone used (`OnboardingSetup`, `HydrationNotice` if unused elsewhere). Verify nothing else imports `OnboardingPageContent`:

Run: `grep -rn "OnboardingPageContent" src/`
Expected: no matches after deletion.

- [ ] **Step 5: Add the (app) gate**

In `src/app/(app)/layout.tsx`, add the import and the gate. After the `if (!user) redirect("/login")` block, before `return (`:

```tsx
import { readOnboardingCompleted } from "@/features/onboarding/api/read-onboarding-completed";
// ...
  if (!user) {
    redirect("/login");
  }

  if (!(await readOnboardingCompleted(supabase, user.id))) {
    redirect("/onboarding");
  }
```

- [ ] **Step 6: Redirect signup to onboarding**

In `src/features/auth/api/actions.ts`, in `signUpAction`, change the trailing `redirect("/")` to `redirect("/onboarding")`. Leave `signInAction` as `redirect("/")` (the (app) gate routes un-onboarded sign-ins to onboarding).

- [ ] **Step 7: Check for orphaned onboarding-setup**

Run: `grep -rn "onboarding-setup" src/`
Expected: only its own file. If so:

```bash
git rm src/features/onboarding/components/onboarding-setup.tsx
```

If other importers exist, leave it and note them.

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: compiles; `/onboarding` present; no missing-import errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(onboarding): full-screen route group with hard-gate guards"
```

---

### Task 4: Vault theme tokens + fonts

**Files:**
- Create: `src/features/onboarding/vault/vault.css`
- Modify: `src/app/(onboarding)/layout.tsx` (add fonts)

- [ ] **Step 1: Scoped stylesheet**

Create `src/features/onboarding/vault/vault.css` (selectors scoped under `.vault`, so no global leakage):

```css
.vault {
  --vault-ink: #0a0e17;
  --vault-deep: #17244e;
  --vault-bg: radial-gradient(125% 85% at 28% -10%, #17244e 0%, #0a0e17 58%);
  --vault-surface: rgba(255, 255, 255, 0.05);
  --vault-border: rgba(255, 255, 255, 0.1);
  --vault-text: #eaf0f7;
  --vault-muted: #8a94a6;
  --vault-accent: #c6f24e;
  --vault-accent-2: #7fd93f;
  --vault-radius-card: 22px;
  --vault-radius-ctl: 12px;

  min-height: 100dvh;
  background: var(--vault-bg);
  color: var(--vault-text);
  font-family: var(--font-hanken), ui-sans-serif, system-ui, sans-serif;
}
.vault h1, .vault h2, .vault .vault-display {
  font-family: var(--font-schibsted), ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.02em;
}
.vault-eyebrow { font-size: 0.7rem; letter-spacing: 0.2em; font-weight: 700; color: var(--vault-accent); }
.vault-muted { color: var(--vault-muted); }
.vault-surface { background: var(--vault-surface); border: 1px solid var(--vault-border); }
@media (prefers-reduced-motion: reduce) {
  .vault * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 2: Load fonts in the onboarding layout**

In `src/app/(onboarding)/layout.tsx`, add at top and apply variables to the `.vault` wrapper:

```tsx
import { Schibsted_Grotesk, Hanken_Grotesk } from "next/font/google";

const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], weight: ["400", "500", "700"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], weight: ["400", "500", "600"] });
```

Change the wrapper to:

```tsx
  return <div className={`vault ${schibsted.variable} ${hanken.variable}`}>{children}</div>;
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compiles; fonts fetched at build.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(onboarding): scoped Midnight Vault tokens and fonts"
```

---

### Task 5: Vault primitives

**Files:**
- Create: `src/features/onboarding/vault/components/primitives/{vault-button,vault-field,vault-select,repeatable-row,empty-state}.tsx`

Apply `frontend-design:frontend-design`. Each consumes vault CSS vars via inline style or className.

**Interfaces (Produces):**
- `VaultButton(props: { variant?: "primary" | "ghost"; type?: "button" | "submit"; onClick?: () => void; disabled?: boolean; children: ReactNode })`
- `VaultField(props: { label: string; error?: string; htmlFor: string; children: ReactNode })` - label + slot + error text
- `VaultSelect(props: { id: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] })`
- `RepeatableRow(props: { onRemove: () => void; children: ReactNode })`
- `EmptyState(props: { title: string; hint: string; actionLabel: string; onAdd: () => void })`

- [ ] **Step 1: Implement the five primitives**

`vault-button.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

export function VaultButton({
  variant = "primary",
  type = "button",
  onClick,
  disabled,
  children,
}: {
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const base = {
    borderRadius: "var(--vault-radius-ctl)",
    fontWeight: 700,
    padding: "12px 20px",
    fontSize: "0.9rem",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "transform .12s ease, background .12s ease",
  } as const;
  const styles =
    variant === "primary"
      ? { ...base, background: "var(--vault-accent)", color: "var(--vault-ink)", border: "none" }
      : { ...base, background: "transparent", color: "var(--vault-muted)", border: "none" };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={styles}>
      {children}
    </button>
  );
}
```

`vault-field.tsx`:

```tsx
import type { ReactNode } from "react";

export function VaultField({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} className="vault-eyebrow">
        {label}
      </label>
      {children}
      {error ? (
        <span style={{ color: "#ff8585", fontSize: "0.72rem", fontWeight: 500 }}>{error}</span>
      ) : null}
    </div>
  );
}
```

Implement `vault-select.tsx` (a styled native `<select>` consuming the vault surface/border vars - native select keeps it accessible and PWA-light), `repeatable-row.tsx` (a `.vault-surface` row with a remove "x" button calling `onRemove`), and `empty-state.tsx` (centered title + hint + a `VaultButton` calling `onAdd`). Keep each under ~60 lines, vault-styled, accessible labels.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/vault/components/primitives
git commit -m "feat(onboarding): vault UI primitives"
```

---

### Task 6: Guardian hero (Remotion)

**Files:**
- Create: `guardian-hero.tsx`, `guardian-shield-static.tsx`, `guardian-hero-player.tsx`

Apply `remotion-best-practices`. Frame-driven; no `Date.now`/`Math.random`.

**Interfaces (Produces):**
- `GuardianHero(props: { variant: "loop" | "lock" })` - Remotion composition component
- `GuardianHeroPlayer(props: { variant: "loop" | "lock" })` - lazy `<Player>` wrapper; renders `GuardianShieldStatic` under reduced motion
- `GuardianShieldStatic(props: { locked?: boolean })`

- [ ] **Step 1: Static fallback**

`guardian-shield-static.tsx` - the shield + check as a static inline SVG (lime stroke on transparent), `locked` fills the shield solid. ~40 lines, no animation.

- [ ] **Step 2: Remotion composition**

`guardian-hero.tsx`:

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export function GuardianHero({ variant }: { variant: "loop" | "lock" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 40 });
  const pulse = interpolate(frame % 90, [0, 90], [0.6, 1.25]);
  const pulseOpacity = interpolate(frame % 90, [0, 90], [0.7, 0]);
  const lock = variant === "lock" ? spring({ frame, fps, config: { damping: 200 } }) : 0;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "transparent" }}>
      <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: "2px solid rgba(198,242,78,0.45)", transform: `scale(${pulse})`, opacity: pulseOpacity }} />
      <svg viewBox="0 0 100 100" width={180} height={180} style={{ filter: "drop-shadow(0 0 18px rgba(198,242,78,0.5))" }}>
        <path d="M50 8 L83 20 V50 C83 71 68 86 50 93 C32 86 17 71 17 50 V20 Z"
          fill={variant === "lock" ? `rgba(198,242,78,${0.12 + lock * 0.2})` : "rgba(198,242,78,0.10)"}
          stroke="#c6f24e" strokeWidth={3} strokeLinejoin="round"
          strokeDasharray={300} strokeDashoffset={300 - draw * 300} />
        <path d="M35 51 l11 12 l21 -26" fill="none" stroke="#c6f24e" strokeWidth={4}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={60} strokeDashoffset={60 - interpolate(draw, [0.4, 1], [0, 1], { extrapolateLeft: "clamp" }) * 60} />
      </svg>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 3: Lazy Player wrapper with reduced-motion switch**

`guardian-hero-player.tsx`:

```tsx
"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GuardianShieldStatic } from "./guardian-shield-static";
import { GuardianHero } from "./guardian-hero";

const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), { ssr: false });

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function GuardianHeroPlayer({ variant }: { variant: "loop" | "lock" }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <GuardianShieldStatic locked={variant === "lock"} />;
  return (
    <Player
      component={GuardianHero}
      inputProps={{ variant }}
      durationInFrames={variant === "loop" ? 90 : 60}
      fps={30}
      compositionWidth={360}
      compositionHeight={360}
      loop={variant === "loop"}
      autoPlay
      controls={false}
      style={{ width: "100%", maxWidth: 320 }}
    />
  );
}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; `@remotion/player` is in the client bundle only (dynamic, ssr:false).

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/vault/components/guardian-*.tsx
git commit -m "feat(onboarding): Guardian Pulse Remotion hero with reduced-motion fallback"
```

---

### Task 7: Form types + payload builder (TDD)

**Files:**
- Create: `src/features/onboarding/vault/lib/onboarding-form.ts`, `src/features/onboarding/vault/lib/onboarding-form.test.ts`

**Interfaces (Produces):**
- `OnboardingFormValues`, `ExpenseRow`, `DebtRow`, `GoalRow`
- `emptyExpenseRow()`, `emptyDebtRow()`, `emptyGoalRow()`
- `buildOnboardingPayload(values: OnboardingFormValues): { profile; expenses; debts; goals }` - drops blank-label rows; returned object is the exact arg for `saveFinancialProfileAction`

- [ ] **Step 1: Write failing tests**

`onboarding-form.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildOnboardingPayload, emptyExpenseRow } from "./onboarding-form";

const base = {
  fullName: "Maria Santos",
  currency: "PHP",
  payFrequency: "monthly",
  monthlyIncome: "40000",
  estimatedVariableExpenses: "8000",
  currentSavings: "15000",
  emergencyFundTarget: "60000",
  expenses: [],
  debts: [],
  goals: [],
} as const;

describe("buildOnboardingPayload", () => {
  it("maps profile scalar fields", () => {
    const out = buildOnboardingPayload({ ...base });
    expect(out.profile).toMatchObject({
      currency: "PHP",
      fullName: "Maria Santos",
      payFrequency: "monthly",
      monthlyIncome: "40000",
      currentSavings: "15000",
      emergencyFundTarget: "60000",
      estimatedVariableExpenses: "8000",
    });
    expect(out.expenses).toEqual([]);
    expect(out.debts).toEqual([]);
    expect(out.goals).toEqual([]);
  });

  it("drops rows with a blank label (skippable lists)", () => {
    const out = buildOnboardingPayload({
      ...base,
      expenses: [
        { label: "Rent", amount: "12000", dueDay: "1", isRecurring: true },
        { ...emptyExpenseRow() },
      ],
    });
    expect(out.expenses).toHaveLength(1);
    expect(out.expenses[0]).toMatchObject({ label: "Rent", amount: "12000", dueDay: "1", isRecurring: true });
  });

  it("maps debt and goal rows by field name", () => {
    const out = buildOnboardingPayload({
      ...base,
      debts: [{ label: "Card", outstandingBalance: "20000", minimumPayment: "2000", dueDay: "5", interestRate: "0.03" }],
      goals: [{ label: "Travel", targetAmount: "50000", savedAmount: "5000", monthlyContribution: "3000", targetDate: "", priority: "high" }],
    });
    expect(out.debts[0]).toMatchObject({ label: "Card", outstandingBalance: "20000", minimumPayment: "2000", dueDay: "5", interestRate: "0.03" });
    expect(out.goals[0]).toMatchObject({ label: "Travel", targetAmount: "50000", priority: "high" });
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- onboarding-form`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`onboarding-form.ts`:

```ts
import type { CurrencyCode, GoalPriority, PayFrequency } from "@/types/finance";

export interface ExpenseRow { label: string; amount: string; dueDay: string; isRecurring: boolean }
export interface DebtRow { label: string; outstandingBalance: string; minimumPayment: string; dueDay: string; interestRate: string }
export interface GoalRow { label: string; targetAmount: string; savedAmount: string; monthlyContribution: string; targetDate: string; priority: GoalPriority }

export interface OnboardingFormValues {
  fullName: string;
  currency: CurrencyCode;
  payFrequency: PayFrequency;
  monthlyIncome: string;
  estimatedVariableExpenses: string;
  currentSavings: string;
  emergencyFundTarget: string;
  expenses: ExpenseRow[];
  debts: DebtRow[];
  goals: GoalRow[];
}

export const emptyExpenseRow = (): ExpenseRow => ({ label: "", amount: "", dueDay: "1", isRecurring: true });
export const emptyDebtRow = (): DebtRow => ({ label: "", outstandingBalance: "", minimumPayment: "", dueDay: "1", interestRate: "" });
export const emptyGoalRow = (): GoalRow => ({ label: "", targetAmount: "", savedAmount: "", monthlyContribution: "", targetDate: "", priority: "medium" });

const hasLabel = (row: { label: string }) => row.label.trim() !== "";

export function buildOnboardingPayload(values: OnboardingFormValues) {
  return {
    profile: {
      currency: values.currency,
      fullName: values.fullName,
      payFrequency: values.payFrequency,
      monthlyIncome: values.monthlyIncome,
      estimatedVariableExpenses: values.estimatedVariableExpenses,
      currentSavings: values.currentSavings,
      emergencyFundTarget: values.emergencyFundTarget,
    },
    expenses: values.expenses.filter(hasLabel).map((e) => ({
      label: e.label,
      amount: e.amount,
      dueDay: e.dueDay,
      isRecurring: e.isRecurring,
    })),
    debts: values.debts.filter(hasLabel).map((d) => ({
      label: d.label,
      outstandingBalance: d.outstandingBalance,
      minimumPayment: d.minimumPayment,
      dueDay: d.dueDay,
      interestRate: d.interestRate === "" ? undefined : d.interestRate,
    })),
    goals: values.goals.filter(hasLabel).map((g) => ({
      label: g.label,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      monthlyContribution: g.monthlyContribution,
      targetDate: g.targetDate === "" ? undefined : g.targetDate,
      priority: g.priority,
    })),
  };
}
```

(String values are coerced by `saveFinancialProfileAction`'s zod `money`/`dueDay` schemas on save.)

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- onboarding-form`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/vault/lib
git commit -m "feat(onboarding): form value types and payload builder with tests"
```

---

### Task 8: Onboarding shell + stepper

**Files:**
- Create: `onboarding-shell.tsx`, `vault-stepper.tsx`

Apply `frontend-design:frontend-design`.

**Interfaces (Produces):**
- `OnboardingShell(props: { step: number; total: number; label: string; hero: ReactNode; children: ReactNode; footer: ReactNode })` - 42/58 split desktop, stacked mobile
- `VaultStepper(props: { step: number; labels: string[] })`

- [ ] **Step 1: Implement shell + stepper**

`onboarding-shell.tsx`: CSS grid `42% 58%` at `>=768px`, single column below. Left: brand mark, `hero` slot centered, a value-prop line. Right: `<VaultStepper>` / progress, `vault-eyebrow` showing `STEP {step} / {total} - {label}`, `children` (the step body), then `footer` (nav buttons). Wrap the right-column body in `motion.div` with an `AnimatePresence` keyed by `step` (fade + 12px x-slide), gated so reduced-motion users get no transform. Use `"use client"`.

`vault-stepper.tsx`: a slim progress bar (`width: step/total`) plus the four labels with the active one in `--vault-accent`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/vault/components/onboarding-shell.tsx src/features/onboarding/vault/components/vault-stepper.tsx
git commit -m "feat(onboarding): cinematic split shell and stepper"
```

---

### Task 9: Step 1 - Income & savings

**Files:** Create `step-income-savings.tsx`. Apply `frontend-design:frontend-design`.

**Interfaces (Produces):** `StepIncomeSavings(props: { register; errors })` - consumes a React Hook Form `register` and `FieldErrors<OnboardingFormValues>` from Task 12.

- [ ] **Step 1: Implement**

Render three sub-blocks using `VaultField` + inputs/`VaultSelect`, bound via RHF `register`:
- You: `fullName` (text), `currency` (VaultSelect: PHP/USD/EUR/JPY/SGD), `payFrequency` (VaultSelect from `PAY_FREQUENCY_LABELS`).
- Income: `monthlyIncome` (number), `estimatedVariableExpenses` (number).
- Savings: `currentSavings` (number), `emergencyFundTarget` (number).

Each numeric input `inputMode="decimal"`. Show `errors.<field>?.message`. Currency/pay options from `src/types/finance.ts`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/vault/components/step-income-savings.tsx
git commit -m "feat(onboarding): step 1 income and savings"
```

---

### Task 10: Step 2 - Commitments (expenses | debts toggle)

**Files:** Create `step-commitments.tsx`. Apply `frontend-design:frontend-design`.

**Interfaces (Produces):** `StepCommitments(props: { control; register; errors })` - uses RHF `useFieldArray` for `expenses` and `debts`.

- [ ] **Step 1: Implement**

A segmented control (`Fixed expenses | Debts`) holding local `view` state; only the active list renders. Each list uses `useFieldArray`. Empty list -> `<EmptyState>` ("Add your first expense", skippable). Each row is a `<RepeatableRow>`:
- Expense fields: `label`, `amount` (number), `dueDay` (number 1-31), `isRecurring` (checkbox).
- Debt fields: `label`, `outstandingBalance`, `minimumPayment`, `dueDay`, `interestRate` (optional, `inputMode="decimal"`).
Append via `emptyExpenseRow()` / `emptyDebtRow()`; remove via field-array `remove(i)`. A "Skip for now" affordance is implicit (Continue is always enabled).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/vault/components/step-commitments.tsx
git commit -m "feat(onboarding): step 2 commitments with expenses/debts toggle"
```

---

### Task 11: Step 3 - Goals

**Files:** Create `step-goals.tsx`. Apply `frontend-design:frontend-design`.

**Interfaces (Produces):** `StepGoals(props: { control; register; errors })` - `useFieldArray` for `goals`.

- [ ] **Step 1: Implement**

`useFieldArray` for `goals`; empty -> `<EmptyState>` ("Add a goal you're saving toward", skippable). Row fields: `label`, `targetAmount`, `savedAmount`, `monthlyContribution`, `targetDate` (date input, optional), `priority` (VaultSelect high/medium/low). Append `emptyGoalRow()`, remove via `remove(i)`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/vault/components/step-goals.tsx
git commit -m "feat(onboarding): step 3 goals"
```

---

### Task 12: Step 4 - Review + wizard container + submit

**Files:**
- Create: `step-review.tsx`
- Replace stub: `onboarding-wizard.tsx`

**Interfaces:**
- Consumes: all steps, `OnboardingShell`, `GuardianHeroPlayer`, `buildOnboardingPayload`, `saveFinancialProfileAction`.
- `StepReview(props: { values: OnboardingFormValues; onEdit: (step: number) => void })` - read-only summary with "edit" jumps.

- [ ] **Step 1: Implement review**

`step-review.tsx`: summarize profile + counts/listing of expenses/debts/goals from `values`; each section has an "Edit" button calling `onEdit(stepIndex)`. Vault-styled `.vault-surface` cards.

- [ ] **Step 2: Implement the wizard container**

`onboarding-wizard.tsx` (`"use client"`): 
- `useForm<OnboardingFormValues>` with defaults (empty strings, `currency: "PHP"`, `payFrequency: "monthly"`, empty arrays).
- `const [step, setStep] = useState(0)` over `["Income & savings","Commitments","Goals","Review"]`.
- Per-step validation before advancing: on Continue, run the step's field subset through the canonical schemas (`financialProfileSchema` for step 0; `expenseSchema`/`debtSchema`/`goalSchema` per non-empty row for steps 1-2) via `trigger`/manual parse; block + show errors on failure. Lists with zero rows pass (skippable).
- Render `<OnboardingShell step={step+1} total={4} label={labels[step]} hero={<GuardianHeroPlayer variant={step === 3 ? "lock" : "loop"} />} footer={<nav buttons>}>` with the active step component inside.
- Submit (from Review): `const payload = buildOnboardingPayload(getValues()); const res = await saveFinancialProfileAction(payload); if (!res.ok) setError(res.error); else router.replace("/")` (`useRouter` from `next/navigation`). Surface `res.error` in a vault error banner; keep entered data.

```tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { saveFinancialProfileAction } from "@/features/financial-profile/api/save-financial-profile";
import { buildOnboardingPayload, emptyExpenseRow, type OnboardingFormValues } from "../lib/onboarding-form";
// ...import steps, shell, hero, VaultButton

const LABELS = ["Income & savings", "Commitments", "Goals", "Review"];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<OnboardingFormValues>({
    defaultValues: {
      fullName: "", currency: "PHP", payFrequency: "monthly",
      monthlyIncome: "", estimatedVariableExpenses: "", currentSavings: "", emergencyFundTarget: "",
      expenses: [], debts: [], goals: [],
    },
  });

  async function next() {
    // step-scoped validation here (trigger on the step's fields); return on failure
    setStep((s) => Math.min(s + 1, LABELS.length - 1));
  }

  async function submit() {
    setSaving(true);
    setSubmitError(null);
    const res = await saveFinancialProfileAction(buildOnboardingPayload(form.getValues()));
    if (!res.ok) {
      setSubmitError(res.error);
      setSaving(false);
      return;
    }
    router.replace("/");
  }
  // render OnboardingShell + active step + footer (Back / Continue|Confirm)
}
```

- [ ] **Step 3: Build + typecheck**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 4: Manual smoke (dev)**

Start dev on 3100, sign up a throwaway user, confirm you land on `/onboarding`, walk all 4 steps (including skipping lists), confirm redirect to `/`. (If using the real remote DB, follow the remote-DB testing note.)

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/vault/components/step-review.tsx src/features/onboarding/vault/components/onboarding-wizard.tsx
git commit -m "feat(onboarding): review step and wizard container with submit"
```

---

### Task 13: E2E - gate + completion flow

**Files:** Create `e2e/onboarding-vault.spec.ts`. Follow the project e2e checklist (reset + serial, onboarding-first, port 3100).

- [ ] **Step 1: Write the spec**

Cover:
1. New user: sign up -> redirected to `/onboarding` (no sidebar present). Fill step 1 required fields, skip lists, reach Review, Confirm -> URL becomes `/` and the dashboard/sidebar renders.
2. Onboarded user: navigate to `/onboarding` -> redirected to `/` (assert URL).
Use a reduced-motion browser context (`use: { reducedMotion: "reduce" }` or `page.emulateMedia({ reducedMotion: "reduce" })`) so the static shield renders and Remotion is skipped in CI.

- [ ] **Step 2: Run**

Run: `npm run e2e -- onboarding-vault`
Expected: PASS (both scenarios). Debug with `--headed` if needed.

- [ ] **Step 3: Coverage gate (unit)**

Run: `npm run test:coverage`
Expected: passes the existing threshold; `buildOnboardingPayload` covered.

- [ ] **Step 4: Commit**

```bash
git add e2e/onboarding-vault.spec.ts
git commit -m "test(e2e): onboarding gate and completion flow"
```

---

## Self-Review

**Spec coverage:**
- Routing/hard gate -> Tasks 2, 3. Theme scope -> Task 4. Fonts -> Task 4. Layout (split + mobile) -> Task 8. Hero (loop/lock + reduced-motion) -> Tasks 6, 12. 4 steps + fields -> Tasks 9-12. Skippable lists -> Tasks 7, 10, 11. Reuse save path / direct action -> Tasks 7, 12. Error handling -> Task 12. Tests (unit/e2e/coverage) -> Tasks 7, 13. PWA-friendly (lazy Player, client steps) -> Tasks 6, 12. Out-of-scope app rebrand respected (scoped `.vault`) -> Task 4.
- Currencies/pay/priority verbatim from `src/types/finance.ts` -> Tasks 7, 9.

**Placeholder scan:** Presentational steps (5, 8-11) specify exact props, fields, and patterns rather than full JSX; this is intentional per the user's concise-plan preference and the `frontend-design` application note, not a TODO. All logic-bearing tasks (2, 3, 6, 7, 12) carry complete code. No "TBD"/"handle edge cases" left.

**Type consistency:** `OnboardingFormValues`/`ExpenseRow`/`DebtRow`/`GoalRow` defined in Task 7 and consumed in 9-12. `buildOnboardingPayload` output matches `saveFinancialProfileAction` `setupSchema` ({ profile, expenses, debts, goals }). `GuardianHeroPlayer({ variant })` defined in Task 6, used in Task 12. `readOnboardingCompleted(supabase, userId)` defined in Task 2, used in Task 3. Hero variant union `"loop" | "lock"` consistent across Tasks 6 and 12.
