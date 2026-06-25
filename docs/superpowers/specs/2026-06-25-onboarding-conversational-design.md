# SpendGuard Conversational Onboarding - Design Spec

Date: 2026-06-25
Branch: `feat/onboarding-conversational`
Status: Approved (design), pending implementation plan

## 1. Context

The `feat/onboarding-vault-redesign` work (merged to `main`, 20 commits) shipped a
Midnight Vault visual system and a 4-step form wizard: Income/Savings -> Commitments
-> Goals -> Review. It collects data correctly but reads as a financial form, not the
"trusted second opinion before a purchase" the product is meant to be.

This refactor reshapes the **flow** into a guided conversation, adds the screens the
form lacks (intent, pain points, emergency buffer, debt, cooldown, first-purchase
test, summary), and ends on a real deterministic verdict. It reuses the vault visual
system, the deterministic engine, the Supabase auth/save pattern, and the existing
field/payload logic.

## 2. Goals and non-goals

Goals:
- One main question per screen, conversational cards over dense forms.
- Every answer triggers a micro-response so the user understands why we asked.
- End onboarding with a real "Can I buy this?" verdict from the rule-based engine.
- Keep the verdict deterministic; AI only explains.
- Structured, extensible step configuration (not hardcoded screens).
- Save the profile to Supabase with the server deriving the authenticated user.

Non-goals:
- No visual redesign (reuse Midnight Vault).
- No rebuild of the deterministic engine (extend it surgically).
- No dashboard/app rework beyond the entry CTA.
- No real voice capture, no FX conversion.

## 3. Product principles

- SpendGuard protects real safe-to-spend, not bank balance: buffer, bills, 30-day
  debt, reserved goals all subtract before a verdict.
- The engine decides the verdict (Safe to buy / Buy with caution / Wait / Not
  recommended). The LLM may explain, never decide.
- Tone: calm, direct, non-judgmental. No guilt language, no generic budgeting copy,
  no finance jargon.

## 4. Flow and step configuration

Screens are driven by a typed config array, rendered by index, each with optional
validation, skip semantics, and a micro-response.

```ts
type OnboardingStepId =
  | "welcome" | "intent" | "pain-points" | "setup-intro"
  | "income" | "savings" | "variable-spend"
  | "buffer" | "commitments" | "debts" | "goals"
  | "cooldown" | "first-check" | "summary";

type StepKind =
  | "interstitial"   // copy + CTA, no input
  | "multi-select"   // selectable cards, many
  | "money"          // single MoneyInput
  | "preset"         // preset amount cards + custom
  | "builder"        // repeatable conversational rows
  | "single-select"  // one choice (cooldown)
  | "check"          // first purchase test
  | "summary";

interface OnboardingStep {
  id: OnboardingStepId;
  kind: StepKind;
  required: boolean;        // blocks "continue" if invalid
  skippable: boolean;       // shows a skip affordance
  skipNote?: string;        // plain-language consequence of skipping
}
```

Screen map:

| #  | id            | kind         | Persists                      | Required          |
|----|---------------|--------------|-------------------------------|-------------------|
| 1  | welcome       | interstitial | -                             | -                 |
| 2  | intent        | multi-select | `intent[]`                    | optional          |
| 3  | pain-points   | multi-select | `spending_pain_points[]`      | optional          |
| 4  | setup-intro   | interstitial | -                             | -                 |
| 5  | income        | money        | `monthly_income`, `currency`  | required (> 0)    |
| 6  | savings       | money        | `current_savings`             | required (>= 0)   |
| 7  | variable-spend| money        | `estimated_variable_expenses` | optional (def 0)  |
| 8  | buffer        | preset       | `emergency_buffer`            | optional          |
| 9  | commitments   | builder      | `expenses[]`                  | optional/skippable|
| 10 | debts         | builder      | `debts[]`                     | optional/skippable|
| 11 | goals         | builder      | `goals[]`                     | optional/skippable|
| 12 | cooldown      | single-select| `cooldown_preference`         | optional (def bal)|
| 13 | first-check   | check        | `purchase_checks` row         | skippable         |
| 14 | summary       | summary      | -                             | terminal          |

Note: the spec's "Screen 5: Monthly income" is split into income / savings /
variable-spend because the engine needs savings and variable spend (see Flag A).
The spec's "Screen 4 setup intro" is the interstitial before the money questions.

Welcome CTAs: primary "Set up my guardrail" -> step 2; secondary "I just want to
explore" -> `/onboarding/explore` sandbox (section 8).

## 5. Data model

### 5.1 Onboarding form / profile shape

```ts
interface OnboardingFormValues {
  fullName: string;
  currency: CurrencyCode;            // default PHP
  payFrequency: PayFrequency;
  monthlyIncome: string;
  currentSavings: string;
  estimatedVariableExpenses: string;
  emergencyBuffer: string;           // replaces emergencyFundTarget in the form
  intent: string[];                  // new
  spendingPainPoints: string[];      // new
  cooldownPreference: "light" | "balanced" | "strict"; // new
  expenses: ExpenseRow[];
  debts: DebtRow[];
  goals: GoalRow[];
}
```

`FinancialProfile` gains `emergencyBuffer: number` and
`cooldownPreference: "light" | "balanced" | "strict"`. `intent` and
`spendingPainPoints` are persisted but consumed only by onboarding micro-responses
for now.

### 5.2 Supabase migration (non-destructive)

New migration `supabase/migrations/2026062500xxxx_onboarding_conversational.sql`
adds to `profiles`:

- `emergency_buffer numeric not null default 0`
- `cooldown_preference text not null default 'balanced' check (cooldown_preference in ('light','balanced','strict'))`
- `intent text[] not null default '{}'`
- `spending_pain_points text[] not null default '{}'`

RLS on `profiles` is already per-user (`auth.uid() = user_id`); new columns inherit
it. `emergency_fund_target` is retained (back-compat) but no longer read by the
engine. Optional backfill to preserve prior protection for existing rows:
`update profiles set emergency_buffer = round(emergency_fund_target * 0.2) where emergency_buffer = 0;`
(pre-launch, likely skipped; documented as a choice).

Regenerate `src/types/database.ts` after the migration.

### 5.3 Persistence path

Extend `financialProfileSchema`, `saveFinancialProfileAction`, and
`buildOnboardingPayload` to carry the new fields. The server keeps deriving `userId`
via `requireUserId()`; the client never sends identity. Save still upserts `profiles`
then replaces `expenses` / `debts` / `goals`, then sets `onboarding_completed = true`.

## 6. Deterministic engine changes

All changes preserve determinism (pure functions of profile + purchase). Unit tests
updated to new expected values in the same change.

### 6.1 Emergency buffer

`calculateEmergencyBuffer(profile)` returns the chosen `emergencyBuffer`, clamped to
`>= 0`, replacing `clamp(emergencyFundTarget * 0.2, 0, currentSavings)`. The buffer is
no longer capped at current savings: protecting more than you have honestly floors
safe-to-spend to 0 and trips the buffer-break risk rule, which is correct.

Emergency progress (health score input) is measured against the buffer:
`emergencyProgress = buffer > 0 ? min(100, round(currentSavings / buffer * 100)) : 0`.

### 6.2 Cooldown strictness

`calculateCooldownDays({ amount, preference })` multiplies the price-tier days by a
strictness factor, min 1 day:

- light: 0.5x
- balanced: 1.0x
- strict: 2.0x

`calculatePurchaseDecision` reads `snapshot.profile.cooldownPreference` and passes it
through. (The currently-ignored `safeToSpend` / `urgency` params stay out of scope.)

### 6.3 Tests

Update `emergency-fund`, `cooldown`, and `purchase-decision` unit tests. Keep the
4-verdict thresholds (75 / 50 / 30) unchanged.

## 7. Component architecture

### 7.1 Reused
`OnboardingShell` (cinematic split), `GuardianHeroPlayer` + reduced-motion fallback,
vault primitives (`VaultField`, `VaultInput`, `VaultSelect`, `VaultButton`,
`RepeatableRow`, `EmptyState`), `vault.css` tokens. `VaultStepper` evolves into
`ProgressPath` (more steps, conversational labels).

### 7.2 New
- `SelectableCard` - single/multi select card with selected state, keyboard accessible.
- `MoneyInput` - wraps `VaultInput` with currency prefix and numeric formatting.
- `ConversationalPrompt` - eyebrow + headline + subtext + "why we ask" line.
- `MicroResponse` - reflection shown after an answer.
- `CommitmentBuilder` / `GoalBuilder` - conversational reshape of the current
  expenses/debts/goals row UIs (example chips, one focus at a time, not a spreadsheet).
- `CooldownSelector` - three-option strictness picker with explanation.
- `FirstPurchaseCheck` - item/price/category/note, manual or sample, runs the engine.
- `OnboardingSummary` - protected readout + first action CTA.
- `ExploreSandbox` - read-only sample-data checker.

### 7.3 File layout
New flow under `src/features/onboarding/conversational/` (config, components, lib),
leaving `vault/` primitives importable. The old `vault/` step components
(`step-income-savings`, `step-commitments`, `step-goals`, `step-review`,
`onboarding-wizard`) are replaced; remove them once the new flow renders. Engine
changes stay in `src/lib/calculations/`.

## 8. Explore sandbox and gate

New route `src/app/(onboarding)/explore/page.tsx` rendering `ExploreSandbox`. A
`SAMPLE_SNAPSHOT` constant (realistic fake profile + expenses + debts + goals) feeds a
read-only purchase checker that runs the real `calculatePurchaseDecision`. Nothing
persists; `onboarding_completed` stays false. A prominent "Set up my real guardrail"
CTA routes to `/onboarding`.

`src/proxy.ts` adds `/onboarding/explore` to the paths an authenticated,
not-yet-onboarded user may reach; every other app route stays gated.

## 9. First-purchase-check payoff

After the setup screens (income through cooldown), "continue" persists the profile and
rows and flips `onboarding_completed = true`. Rationale: completion equals data
captured, so a user who closes during the payoff is not trapped re-onboarding.

Step 13 (first-check) builds the snapshot from the captured data, runs
`calculatePurchaseDecision` (deterministic), optionally streams the existing advisor
explanation (`/api/advisor/explain`, explain-only), and saves a `purchase_checks` row
via the existing `save-purchase-check` path. "Try sample" uses a sample item; "Skip"
jumps to summary.

Step 14 (summary) shows protected buffer, total bills protected, debts considered,
goals protected, cooldown mode, and estimated safe-to-spend
(`calculateSafeToSpend(snapshot)`), then a CTA into the app's purchase checker.

## 10. Skip and validation rules

- Required: monthly income (> 0, hard gate, already enforced via a gate schema) and
  current savings (>= 0).
- Optional with a skip affordance and plain-language consequence: intent, pain points,
  variable spend, buffer (a "Not now" preset), commitments, debts, goals, cooldown
  (defaults to balanced), first-check.
- Skip notes explain the effect, e.g. "You can add bills later. Until then your
  safe-to-spend will look higher than it really is."

## 11. Copy and tone

Conversational, calm, non-judgmental. Debt screen is explicitly non-shaming. Micro-
responses reflect the user's answer ("That makes sense. SpendGuard will focus on your
real safe-to-spend, not just your balance."). No jargon, no guilt, no "track your
expenses" framing.

## 12. Accessibility and motion

Reuse the Guardian hero's `prefers-reduced-motion` fallback. Selectable cards are real
buttons/checkboxes with labels, focus rings, and keyboard support. Money inputs use
`inputMode="decimal"` and proper labels. Step transitions respect reduced motion.

## 13. Testing

- Unit: engine changes (buffer, cooldown), extended payload builder, step-config
  validation.
- Component: `SelectableCard`, `MoneyInput`, `MicroResponse`, `CooldownSelector`.
- E2E: rewrite to `e2e/onboarding-conversational.spec.ts` covering happy path, a skip
  path, the explore sandbox, and a first-check verdict. Follow the project e2e
  checklist (dedicated port 3100, reset + serial, onboarding-first, wait for remote
  hydration). Retire `e2e/onboarding-vault.spec.ts`.

## 14. Out of scope

Real voice capture (a disabled "coming soon" chip stands in), dashboard rework, FX
conversion, and any consumer of `intent` / `spending_pain_points` beyond onboarding
micro-responses.

## 15. Risks and deviations

- Flag A - spec under-collects: literal Screen 5 asks only income, but the engine
  needs current savings (and benefits from variable spend). Added as required /
  optional steps. Non-negotiable for a meaningful verdict.
- Flag B - engine behavior change: replacing the 0.2x buffer derivation changes
  safe-to-spend for anyone already onboarded. Non-destructive but a behavior shift;
  acceptable pre-launch, optional backfill noted in 5.2.
- Concept overlap: "emergency buffer" (protected floor, step 8) is distinct from an
  "Emergency fund" savings goal (one of the optional goals, step 11). The spec is
  explicit and copy will keep them distinct.

## 16. Resolved decisions

- Approach: reshape flow, keep vault visual system + engine + schema.
- Engine: wire both buffer and cooldown strictness into the deterministic engine.
- Explore CTA: sample-data read-only sandbox; real app stays gated.
- Voice: manual + sample only; voice is a disabled "coming soon" affordance.
- Intent / pain points: stored on the profile, used for micro-responses now.
