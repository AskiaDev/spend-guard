# SpendGuard Responsive Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build eight cohesive, production-ready responsive SpendGuard pages that match the approved desktop/mobile references while preserving the current local-first financial behavior.

**Architecture:** Replace the monolithic tab switcher with an App Router route group, a shared responsive shell, and feature-local page components. Mount the existing financial-state hook behind one client context so every route reads and mutates the same IndexedDB-backed state without changing calculation rules or database schemas.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, React Hook Form, Zod, Lucide React, Recharts, Vitest, Testing Library, Playwright.

---

## Scope and execution rules

- Work only in `~/.config/superpowers/worktrees/spend-guard/spendguard-redesign` on `feat/spendguard-redesign`.
- Read the relevant files in `node_modules/next/dist/docs/01-app/` before changing routing, images, fonts, or client boundaries.
- Follow red-green-refactor for each behavioral task.
- Do not add dependencies; CSS transitions and existing libraries cover the required UI.
- Do not change affordability formulas, Supabase migrations, RLS, login, or signup behavior.
- Do not create commits. The repository instructions require explicit user authorization first, so commit steps are intentionally replaced with diff checkpoints.

## File map

### Shared application structure

- Create `src/app/(app)/layout.tsx` — state provider and responsive shell.
- Create `src/app/(app)/page.tsx` — dashboard route.
- Create `src/app/(app)/checker/page.tsx` — purchase wizard route.
- Create `src/app/(app)/checker/result/page.tsx` — decision route.
- Create `src/app/(app)/voice/page.tsx` — voice route.
- Create `src/app/(app)/goals/page.tsx` — goals route.
- Create `src/app/(app)/cooldown/page.tsx` — cooldown route.
- Create `src/app/(app)/reports/page.tsx` — weekly report route.
- Create `src/app/(app)/onboarding/page.tsx` — setup route.
- Delete `src/app/spendguard-client.tsx` after route parity is verified.
- Move root dashboard responsibility from `src/app/page.tsx` into the route group.
- Modify `src/app/layout.tsx` and `src/app/globals.css` — metadata, tokens, typography, focus, motion, and safe-area behavior.

### Shared components and state

- Create `src/providers/financial-state-provider.tsx` — provider and guarded consumer hook.
- Create `src/components/layout/app-shell.tsx` — shell composition.
- Create `src/components/layout/app-navigation.tsx` — pathname-aware desktop/mobile navigation.
- Create `src/components/layout/app-header.tsx` — logo, alerts, help, avatar.
- Create `src/components/brand/spendguard-logo.tsx` — inline SVG brand mark.
- Create `src/components/brand/advisor-avatar.tsx` — consistent flat coach avatar.
- Create `src/components/feedback/page-skeleton.tsx` — stable loading state.
- Create `src/components/feedback/empty-state.tsx` — one-action empty state.
- Create `src/components/feedback/inline-notice.tsx` — warning/error/success callout.
- Create `src/components/finance/status-badge.tsx` — icon plus decision label.
- Create `src/components/finance/progress-ring.tsx` — accessible circular progress.
- Create `src/components/finance/score-gauge.tsx` — accessible semicircle score.
- Create `src/components/finance/step-progress.tsx` — desktop/mobile wizard stepper.
- Modify `src/components/ui/{button,card,badge,form-fields,progress}.tsx` — approved tokens and states.

### Feature implementation

- Rewrite `src/features/dashboard/components/dashboard-overview.tsx`.
- Split purchase checker into `purchase-checker-wizard.tsx`, `purchase-result.tsx`, and feature-local helpers/tests.
- Create `src/features/voice/components/voice-purchase-checker.tsx` and tests.
- Rewrite `src/features/goals/components/goals-panel.tsx`.
- Rewrite `src/features/cooldown/components/cooldown-panel.tsx`.
- Rewrite `src/features/reports/components/reports-panel.tsx`.
- Rewrite `src/features/onboarding/components/onboarding-setup.tsx` and tests.
- Create `src/features/reference-data.ts` — reference-only view content not represented by the current domain model.
- Keep existing `src/features/*/api` functions and storage/calculation modules unchanged.

### Assets and verification

- Create `public/illustrations/*.svg` — selected/recolored unDraw assets.
- Create `public/illustrations/SOURCES.md` — source URLs and license reference.
- Replace `e2e/spendguard.spec.ts` with route-based desktop/mobile flows.
- Create `e2e/spendguard-visual.spec.ts` for route and viewport screenshot inspection without committing brittle image snapshots.

---

### Task 1: Establish design tokens and UI primitives

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/form-fields.tsx`
- Modify: `src/components/ui/progress.tsx`
- Test: `src/components/ui/ui-primitives.test.tsx`

- [x] **Step 1: Write failing primitive behavior tests**

Create tests that assert a default button has a 44px height, disabled semantics,
cards remain semantic sections, labels bind to controls, and progress exposes a
named `progressbar` with numeric values:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Card } from "./card";
import { Input, Label } from "./form-fields";
import { Progress } from "./progress";

describe("SpendGuard UI primitives", () => {
  it("provides accessible controls and progress semantics", () => {
    render(
      <>
        <Button disabled>Analyzing…</Button>
        <Card aria-label="Summary" />
        <Label htmlFor="price">Price</Label>
        <Input id="price" />
        <Progress value={56} label="Emergency fund" />
      </>
    );

    expect(screen.getByRole("button", { name: "Analyzing…" })).toBeDisabled();
    expect(screen.getByRole("region", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByLabelText("Price")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Emergency fund" })).toHaveAttribute(
      "aria-valuenow",
      "56"
    );
  });
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `npm test -- src/components/ui/ui-primitives.test.tsx`
Expected: FAIL because `Progress` does not accept `label` or expose progressbar semantics.

- [x] **Step 3: Implement approved tokens and primitive contracts**

Define Tailwind theme variables for background, surface, border, foreground,
primary, safe, caution, risk, advisor, radii, and shadows. Update primitives to
use 44px controls, 12px button/input radii, 20px card radii, blue focus rings,
and muted placeholder/error text. Implement this public progress contract:

```tsx
export function Progress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(boundedValue)}
      className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div className="h-full rounded-full bg-safe transition-[width]" style={{ width: `${boundedValue}%` }} />
    </div>
  );
}
```

- [x] **Step 4: Run primitive tests and full existing tests**

Run: `npm test -- src/components/ui/ui-primitives.test.tsx && npm test`
Expected: new primitive test PASS; existing calls that lack `label` fail at typecheck or tests and are updated with meaningful labels.

- [x] **Step 5: Review the foundation diff**

Run: `git diff --check && git diff -- src/app src/components/ui`
Expected: no whitespace errors; changes are limited to global styling and shared primitives.

### Task 2: Add shared state provider and responsive app shell

**Files:**
- Create: `src/providers/financial-state-provider.tsx`
- Create: `src/components/brand/spendguard-logo.tsx`
- Create: `src/components/brand/advisor-avatar.tsx`
- Create: `src/components/layout/app-navigation.tsx`
- Create: `src/components/layout/app-header.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/app-shell.test.tsx`
- Create: `src/app/(app)/layout.tsx`

- [x] **Step 1: Write failing shell tests**

Mock `next/navigation` pathname as `/goals`; render `AppShell` with child content;
assert desktop and mobile navigation labels exist, Goals links expose
`aria-current="page"`, logo has an accessible name, and child content renders once.

```tsx
vi.mock("next/navigation", () => ({ usePathname: () => "/goals" }));

it("marks the matching desktop and mobile destination as current", () => {
  render(<AppShell><h1>Goals content</h1></AppShell>);
  expect(screen.getAllByRole("link", { name: "Goals" })).toHaveLength(2);
  for (const link of screen.getAllByRole("link", { name: "Goals" })) {
    expect(link).toHaveAttribute("aria-current", "page");
  }
  expect(screen.getByRole("heading", { name: "Goals content" })).toBeInTheDocument();
});
```

- [x] **Step 2: Run the shell test and verify RED**

Run: `npm test -- src/components/layout/app-shell.test.tsx`
Expected: FAIL because the shell modules do not exist.

- [x] **Step 3: Implement navigation configuration and shell**

Use these exact destinations:

```ts
export const primaryNavigation = [
  { href: "/", label: "Dashboard", mobileLabel: "Home", icon: House },
  { href: "/checker", label: "Purchase Checker", mobileLabel: "Checker", icon: SearchCheck },
  { href: "/voice", label: "Voice Check", mobileLabel: "Voice", icon: Mic },
  { href: "/goals", label: "Goals", mobileLabel: "Goals", icon: Target },
  { href: "/cooldown", label: "Cooldown", mobileLabel: "More", icon: Menu },
] as const;
```

Add desktop-only Debts, Reports, and Settings links to the sidebar. Render a
fixed 240px sidebar at `lg`, mobile top header below `lg`, and safe-area-aware
bottom navigation. Implement `FinancialStateProvider` as a client wrapper around
the existing `useFinancialState` hook and throw a clear error if consumed outside
the provider.

- [x] **Step 4: Run shell tests**

Run: `npm test -- src/components/layout/app-shell.test.tsx`
Expected: PASS.

- [x] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS with no server/client boundary or navigation typing errors.

### Task 3: Introduce App Router pages without behavior changes

**Files:**
- Create: `src/app/(app)/page.tsx`
- Create: `src/app/(app)/checker/page.tsx`
- Create: `src/app/(app)/checker/result/page.tsx`
- Create: `src/app/(app)/voice/page.tsx`
- Create: `src/app/(app)/goals/page.tsx`
- Create: `src/app/(app)/cooldown/page.tsx`
- Create: `src/app/(app)/reports/page.tsx`
- Create: `src/app/(app)/onboarding/page.tsx`
- Modify: `src/app/page.tsx`
- Delete after parity: `src/app/spendguard-client.tsx`
- Test: `e2e/spendguard.spec.ts`

- [x] **Step 1: Write a failing route smoke test**

Create a Playwright loop that visits each route and asserts its page heading:

```ts
for (const [path, heading] of [
  ["/", "Good morning, Miguel!"],
  ["/checker", "Purchase Checker"],
  ["/checker/result", "Purchase Checker"],
  ["/voice", "Voice Purchase Checker"],
  ["/goals", "Goals"],
  ["/cooldown", "Cooldown / Wishlist"],
  ["/reports", "Weekly Advisor Report"],
  ["/onboarding", "Let’s set up SpendGuard for you"],
] as const) {
  test(`renders ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  });
}
```

- [x] **Step 2: Run the route test and verify RED**

Run: `npx playwright test e2e/spendguard.spec.ts --project=chromium`
Expected: FAIL on the first non-root route with a 404 or missing heading.

- [x] **Step 3: Add route files and temporary feature adapters**

Each page exports metadata where useful and renders one feature component inside
the route-group shell. Keep the route files server components unless they directly
need client hooks. Move `/` into `(app)/page.tsx`; remove the conflicting root page
after the new route resolves. Keep `spendguard-client.tsx` until every former
mutation is reachable through the new pages, then delete it.

- [x] **Step 4: Run route smoke and typecheck**

Run: `npm run typecheck && npx playwright test e2e/spendguard.spec.ts --project=chromium`
Expected: PASS for all eight headings.

### Task 4: Build shared financial visuals and feedback states

**Files:**
- Create: `src/components/finance/status-badge.tsx`
- Create: `src/components/finance/progress-ring.tsx`
- Create: `src/components/finance/score-gauge.tsx`
- Create: `src/components/finance/step-progress.tsx`
- Create: `src/components/finance/finance-components.test.tsx`
- Create: `src/components/feedback/page-skeleton.tsx`
- Create: `src/components/feedback/empty-state.tsx`
- Create: `src/components/feedback/inline-notice.tsx`

- [x] **Step 1: Write failing semantic tests**

Assert all four decision badges include visible labels and icons, progress ring
exposes `role="progressbar"`, score gauge includes `68 / 100`, completed steps
render check icons with accessible completed labels, and error notices use
`role="alert"`.

- [x] **Step 2: Run and verify RED**

Run: `npm test -- src/components/finance/finance-components.test.tsx`
Expected: FAIL because the modules do not exist.

- [x] **Step 3: Implement the components**

Use SVG `circle` elements with `strokeDasharray`/`strokeDashoffset` for the ring,
an SVG arc for the gauge, and Lucide icons for statuses. `StatusBadge` accepts the
existing `PurchaseDecision` union and maps labels exactly:

```ts
export const decisionLabels: Record<PurchaseDecision, string> = {
  SAFE_TO_BUY: "Safe to Buy",
  BUY_WITH_CAUTION: "Buy with Caution",
  WAIT: "Wait",
  NOT_RECOMMENDED: "Not Recommended",
};
```

`StepProgress` accepts `{ label: string }[]`, a one-based current step, and uses
an ordered list. Skeletons preserve card heights and respect reduced motion.

- [x] **Step 4: Run tests and accessibility-focused lint**

Run: `npm test -- src/components/finance/finance-components.test.tsx && npm run lint`
Expected: PASS.

### Task 5: Rebuild the dashboard

**Files:**
- Create: `src/features/reference-data.ts`
- Rewrite: `src/features/dashboard/components/dashboard-overview.tsx`
- Create: `src/features/dashboard/components/dashboard-overview.test.tsx`
- Modify: `src/features/dashboard/index.ts`

- [x] **Step 1: Write failing dashboard tests**

Render with the current default snapshot and assert separate “Current Savings”
and “Safe to Spend” cards, warning text, six KPI labels, active goals, recent
checks with status labels, and “Read full insight.” Include an empty checks case
that exposes “Run your first purchase check.”

- [x] **Step 2: Run and verify RED**

Run: `npm test -- src/features/dashboard/components/dashboard-overview.test.tsx`
Expected: FAIL because the current dashboard lacks the requested content.

- [x] **Step 3: Implement the dashboard composition**

Use live `snapshot`, `checks`, and calculated `metrics` for financial amounts.
Use `referenceGoals` and `referencePurchases` only to fill fields the current
domain does not represent, and label example-only empty content. Implement the
desktop three-column KPI grid, mobile two-column grid, warning banner, goal rows,
recent checks, and advisor card. Use `ProgressRing` and `ScoreGauge`; do not
introduce a dense chart.

- [x] **Step 4: Run dashboard tests and inspect responsive markup**

Run: `npm test -- src/features/dashboard/components/dashboard-overview.test.tsx && npm run typecheck`
Expected: PASS.

### Task 6: Build the purchase checker wizard with TDD

**Files:**
- Create: `src/features/purchase-checker/components/purchase-checker-wizard.tsx`
- Create: `src/features/purchase-checker/components/purchase-checker-wizard.test.tsx`
- Modify: `src/features/purchase-checker/index.ts`

- [x] **Step 1: Write failing wizard progression tests**

Cover:

1. Step 1 blocks Continue until product, positive price, and category exist.
2. Step 2 preserves reason, urgency, alternative, and income-generation choices.
3. Step 3 reveals down payment/monthly payment/term for installment and hides
   them for cash.
4. Analyze maps the wizard into the existing `PurchaseInput` contract and calls
   `onRunCheck` once.
5. A rejected analysis shows the exact non-blaming error message.

The success assertion must verify:

```ts
expect(onRunCheck).toHaveBeenCalledWith({
  itemName: "iPhone Pro Max 1TB",
  amount: 170000,
  urgency: "can_wait",
  paymentMethod: "installment",
  installmentMonths: 24,
  monthlyPayment: 6000,
});
```

- [x] **Step 2: Run wizard tests and verify RED**

Run: `npm test -- src/features/purchase-checker/components/purchase-checker-wizard.test.tsx`
Expected: FAIL because the wizard does not exist.

- [x] **Step 3: Implement wizard state and step validation**

Use one React Hook Form instance so values persist across steps. Keep UI-only
fields in the form but map only supported fields into `PurchaseInput`. Render
StepProgress, accessible radio cards, conditional payment inputs, Back,
Continue, Save Draft, and Analyze Purchase. Navigate to `/checker/result` only
after `onRunCheck` resolves.

- [x] **Step 4: Run wizard and existing calculation tests**

Run: `npm test -- src/features/purchase-checker/components/purchase-checker-wizard.test.tsx src/lib/calculations/purchase-decision.test.ts`
Expected: PASS; calculation tests remain unchanged.

### Task 7: Build the purchase result experience

**Files:**
- Create: `src/features/purchase-checker/components/purchase-result.tsx`
- Create: `src/features/purchase-checker/components/purchase-result.test.tsx`
- Modify: `src/app/(app)/checker/result/page.tsx`
- Retire after parity: `src/features/purchase-checker/components/purchase-checker-panel.tsx`
- Retire after parity: `src/features/purchase-checker/components/purchase-checker-panel.test.tsx`

- [x] **Step 1: Write failing result tests**

Assert a `NOT_RECOMMENDED` check renders the red badge, score `92/100`, main
explanation, purchase summary, four impact rows/cards, five reasons, advisor
explanation, recommended action, and all four action buttons. Assert Add to Goal
and Add to Cooldown call their existing mutations with the active check.

- [x] **Step 2: Run and verify RED**

Run: `npm test -- src/features/purchase-checker/components/purchase-result.test.tsx`
Expected: FAIL because the result component does not exist.

- [x] **Step 3: Implement result layout and fallback behavior**

Derive impact presentation from the active check plus reference explanatory
content. When no stored check exists, render the supplied iPhone example with a
visible “Example decision” label; never imply it is user data. Use a left summary
column and center result area on desktop, stacked cards on mobile, and a
safe-area-aware action bar.

- [x] **Step 4: Run result tests and remove the legacy combined panel**

Run: `npm test -- src/features/purchase-checker && npm run typecheck`
Expected: PASS after legacy imports and tests are removed or migrated.

### Task 8: Build all four voice-check states

**Files:**
- Create: `src/features/voice/index.ts`
- Create: `src/features/voice/components/voice-purchase-checker.tsx`
- Create: `src/features/voice/components/voice-purchase-checker.test.tsx`
- Modify: `src/app/(app)/voice/page.tsx`

- [x] **Step 1: Write failing voice state tests**

Cover ready copy, unsupported-browser fallback, listening timer/Stop button,
transcript rendering, extraction, explicit review warning, editable extracted
fields, re-record reset, and analyze handoff. Use the provided transcript and
assert `₱170,000`, `₱50,000`, `₱6,000`, and `24 months` appear before analysis.

- [x] **Step 2: Run and verify RED**

Run: `npm test -- src/features/voice/components/voice-purchase-checker.test.tsx`
Expected: FAIL because the voice feature does not exist.

- [x] **Step 3: Implement a finite explicit view state**

Use:

```ts
type VoiceStage = "ready" | "listening" | "transcript" | "review";
```

Keep Web Speech API access inside event handlers, clean up timer intervals and
recognition callbacks, preserve typed transcript fallback, and require review
before calling `onRunCheck`. Use one desktop two-card layout and one mobile state
per screen with sticky actions.

- [x] **Step 4: Run voice and parser tests**

Run: `npm test -- src/features/voice src/lib/voice/parsers.test.ts`
Expected: PASS.

### Task 9: Rebuild goals and cooldown pages

**Files:**
- Rewrite: `src/features/goals/components/goals-panel.tsx`
- Create: `src/features/goals/components/goals-panel.test.tsx`
- Rewrite: `src/features/cooldown/components/cooldown-panel.tsx`
- Create: `src/features/cooldown/components/cooldown-panel.test.tsx`
- Modify: `src/app/(app)/goals/page.tsx`
- Modify: `src/app/(app)/cooldown/page.tsx`

- [x] **Step 1: Write failing goals tests**

Assert four summary metrics, goal labels and amounts, percentage text, monthly
contribution, estimated completion, safe-buy date, most-important badge, New Goal,
and advisor tip. Verify delete controls retain accessible names and mutation calls.

- [x] **Step 2: Write failing cooldown tests**

Assert horizontally navigable tabs, sort control, reference product cards when
persisted items are empty with an “Example items” label, live item rendering when
items exist, decision badges, risk/cooldown text, Recheck, Convert to Goal, More,
and removal behavior.

- [x] **Step 3: Run and verify RED**

Run: `npm test -- src/features/goals src/features/cooldown`
Expected: FAIL against the current compact panels.

- [x] **Step 4: Implement responsive goal and product cards**

Calculate summary totals from `snapshot.goals`; use view helpers for estimated
dates. Keep stacked mobile cards and open desktop cards without nested wrapper
cards. Tabs use buttons with `aria-selected`; More uses a labelled icon button.

- [x] **Step 5: Run tests**

Run: `npm test -- src/features/goals src/features/cooldown`
Expected: PASS.

### Task 10: Rebuild weekly advisor report

**Files:**
- Rewrite: `src/features/reports/components/reports-panel.tsx`
- Create: `src/features/reports/components/reports-panel.test.tsx`
- Modify: `src/app/(app)/reports/page.tsx`

- [x] **Step 1: Write failing report tests**

Assert date range, Download Report, Good Decisions, `78/100`, improved items,
current risks, purchases avoided, goal progress, next best action, Take Action,
coach tip, and educational tip. Verify Generate Report still calls the existing
mutation when no report exists.

- [x] **Step 2: Run and verify RED**

Run: `npm test -- src/features/reports/components/reports-panel.test.tsx`
Expected: FAIL because the current panel lacks the report composition.

- [x] **Step 3: Implement report view model and responsive cards**

Prefer the latest persisted report for score and summary. Fill unsupported
breakdowns from clearly separated reference copy. Implement a three-column then
three-column desktop rhythm, stacked mobile cards, score ring, and a mobile CTA
that remains visible without covering content. Download Report creates a local
text summary through a Blob URL and revokes it immediately after download.

- [x] **Step 4: Run report tests and typecheck**

Run: `npm test -- src/features/reports/components/reports-panel.test.tsx && npm run typecheck`
Expected: PASS.

### Task 11: Rebuild six-step onboarding

**Files:**
- Rewrite: `src/features/onboarding/components/onboarding-setup.tsx`
- Rewrite: `src/features/onboarding/components/onboarding-setup.test.tsx`
- Modify: `src/app/(app)/onboarding/page.tsx`

- [x] **Step 1: Replace tests with six-step behavior coverage**

Test horizontal/vertical step labels, invalid income blocking Step 1, value
persistence after Back, optional savings breakdown, emergency target helper,
expense category sum, debt fields, four goal options, and final normalized
`onSave` payload. Assert “Finish Setup” appears only on Step 6.

- [x] **Step 2: Run and verify RED**

Run: `npm test -- src/features/onboarding/components/onboarding-setup.test.tsx`
Expected: FAIL because the current one-page form has no stepper.

- [x] **Step 3: Implement one form with six validated views**

Use one React Hook Form instance and Zod schemas per step. Keep the left desktop
stepper and horizontal mobile stepper. Render the selected unDraw setup scene,
plain-language helper callouts, Back/Continue, and Finish Setup. Convert the form
into the current `{ profile, expenses, debts, goals }` payload only on final submit.

- [x] **Step 4: Run onboarding tests**

Run: `npm test -- src/features/onboarding/components/onboarding-setup.test.tsx`
Expected: PASS.

### Task 12: Add and document the illustration family

**Files:**
- Create: `public/illustrations/personal-finance.svg`
- Create: `public/illustrations/payment-info.svg`
- Create: `public/illustrations/progress-overview.svg`
- Create: `public/illustrations/setup.svg`
- Create: `public/illustrations/SOURCES.md`
- Modify: dashboard, checker, reports, onboarding, empty-state components that consume them.

- [x] **Step 1: Download only the selected unDraw SVG files**

Use the official illustration pages listed in the design specification. Recolor
the primary accent to `#155EEF` without modifying proportions. Keep SVGs local so
rendering has no runtime network dependency.

- [x] **Step 2: Document provenance**

`SOURCES.md` must list each local filename, source illustration page, download
date, and `https://undraw.co/license`. It must state that unDraw does not require
attribution and that the note exists for provenance.

- [x] **Step 3: Validate SVG safety and usage**

Run: `rg -n '<script|onload=|javascript:' public/illustrations || true`
Expected: no matches. Use `next/image` with explicit dimensions and useful or
empty alt text according to whether each image communicates content.

- [x] **Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS with no image configuration or SVG parsing errors.

### Task 13: Add loading, empty, error, success, and reduced-motion coverage

**Files:**
- Modify: `src/components/feedback/*`
- Modify: all feature components where asynchronous state exists.
- Create: `src/components/feedback/feedback-states.test.tsx`

- [x] **Step 1: Write failing feedback tests**

Assert skeletons have `aria-busy`, error notices use `role="alert"`, success
notices use `aria-live="polite"`, empty states contain one named CTA, and loading
buttons retain their accessible action name.

- [x] **Step 2: Run and verify RED**

Run: `npm test -- src/components/feedback/feedback-states.test.tsx`
Expected: FAIL until all semantics are present.

- [x] **Step 3: Wire feedback states into every route**

Use stable skeleton dimensions during IndexedDB hydration. Catch purchase/report/
setup mutation failures at the feature boundary, show the approved non-blaming
copy, and retain entered data for retry. Add global `prefers-reduced-motion`
rules that disable decorative translation and pulsing while preserving state
changes.

- [x] **Step 4: Run feedback tests and full unit suite**

Run: `npm test -- src/components/feedback/feedback-states.test.tsx && npm test`
Expected: PASS.

### Task 14: Replace E2E flows and validate desktop/mobile behavior

**Files:**
- Rewrite: `e2e/spendguard.spec.ts`
- Create: `e2e/spendguard-visual.spec.ts`
- Modify: `playwright.config.ts` only if adding a mobile project is necessary.

- [x] **Step 1: Write desktop purchase journey**

Visit `/checker`, complete all three input steps, analyze, assert result badge and
explanation, add the check to a goal and cooldown, then verify it appears on
`/goals` and `/cooldown`.

- [x] **Step 2: Write voice review journey**

Visit `/voice`, enter the supplied transcript fallback, extract, edit one field,
confirm, analyze, and assert navigation to the result route.

- [x] **Step 3: Write onboarding journey**

Visit `/onboarding`, complete six steps at 390x844, verify values survive Back,
finish setup, and verify dashboard amounts update.

- [x] **Step 4: Add visual inspection captures**

For every route, set desktop viewport to 1440x1000 and mobile viewport to 390x844,
assert no horizontal overflow, then save screenshots under Playwright’s
test-results output. Do not commit baseline images.

- [x] **Step 5: Run E2E**

Run: `npm run e2e`
Expected: all route, desktop, and mobile journeys PASS.

### Task 15: Final review and verification

**Files:**
- Review: all changed files.
- Update: this plan’s checkboxes as tasks complete.

- [x] **Step 1: Run the complete quality gate**

Run:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run e2e
```

Expected: every command exits 0; Vitest reports at least 80% branches, functions,
lines, and statements.

- [x] **Step 2: Perform browser visual review**

Inspect the 1440px and 390px captures for all routes against the supplied
references. Verify sidebar width, content gutters, card rhythm, typography,
status colors, mobile bottom navigation, sticky actions, overflow, clipped text,
and focus visibility. Fix visual discrepancies and rerun affected checks.

- [x] **Step 3: Run security and accessibility spot checks**

Run: `npm audit --omit=dev` and inspect interactive controls with keyboard-only
navigation. Confirm no secrets, remote runtime illustration calls, raw HTML
injection, or unlabelled icon controls were introduced.

- [x] **Step 4: Review the final diff**

Run: `git status --short && git diff --check && git diff --stat && git diff`
Expected: only redesign docs, application UI, local illustration assets, tests,
and deliberate configuration changes appear. `package-lock.json` remains
unchanged because no dependency was added.

- [x] **Step 5: Prepare handoff without committing**

Report the worktree path, changed routes, tests/checks with exact outcomes, and
remaining caveats. Do not commit, push, or open a PR without explicit approval.
