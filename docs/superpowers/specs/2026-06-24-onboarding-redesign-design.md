# Onboarding Redesign - Design Spec

- **Date:** 2026-06-24
- **Status:** Approved (design), pending implementation plan
- **Scope:** Replace the post-signup onboarding with a radically redesigned, full-screen, hard-gated wizard. Onboarding-only rebrand; the rest of the app is untouched.

## Goal

After signup, new users land on a full-screen onboarding wizard (no sidebar) with a distinct "Midnight Vault" visual identity and an animated Remotion hero. The wizard collects the financial profile the deterministic purchase-check engine needs, then flips `onboarding_completed` and sends the user to the dashboard. Onboarded users are blocked from re-entering onboarding.

## Locked Decisions

| Area | Decision |
|------|----------|
| Animation | Framer Motion (`motion`) for wizard UI transitions; Remotion `<Player>` for the hero animation |
| Theme scope | Onboarding-only. Global tokens (`globals.css` `@theme`) untouched |
| Steps | Consolidate the existing 6 steps into 4 |
| Gate | Hard gate: signup -> onboarding; onboarded users redirected away from `/onboarding` |
| Theme | "Midnight Vault" - dark, cinematic, electric lime on ink |
| Layout | "Cinematic Split" - hero stage left, focused form right; stacks on mobile |
| Hero | "Guardian Pulse" - ambient loop on steps 1-3, shield-lock payoff on Review |
| Lists | Expenses / debts / goals are optional and skippable (inline add, empty state) |

## Visual Design

### Palette (Midnight Vault, onboarding-scoped)

```
--vault-ink:        #0a0e17   /* base background */
--vault-deep:       #17244e   /* radial glow toward top-left */
--vault-bg:         radial-gradient(125% 85% at 28% -10%, #17244e 0%, #0a0e17 58%)
--vault-surface:    rgba(255,255,255,0.05)   /* glass inputs/cards */
--vault-border:     rgba(255,255,255,0.10)
--vault-text:       #eaf0f7
--vault-muted:      #8a94a6
--vault-accent:     #c6f24e   /* electric lime - primary CTA, highlights */
--vault-accent-2:   #7fd93f   /* gradient pair for the accent */
--vault-radius-card: 22px
--vault-radius-ctl:  12px
/* risk meter (hero + any risk surfacing): #dc2626 -> #f5b301 -> #c6f24e */
```

### Typography

- Display: **Schibsted Grotesk** (700) - titles, brand, stepper.
- Body/UI: **Hanken Grotesk** (400/500/600) - labels, inputs, copy.
- Loaded via `next/font/google`, applied only inside the onboarding layout. Global Geist is unchanged.
- Deliberately avoids the overused defaults (Inter / Space Grotesk / Fraunces / Geist) to keep the rebrand distinctive.

### Layout - "Cinematic Split"

- **Desktop:** CSS grid `42% / 58%`.
  - Left stage (dark): brand mark (top), `GuardianHero` (center), rotating value-prop line (bottom, e.g. "Local-first checks. Your money stays yours.").
  - Right column: slim top progress bar, eyebrow (`STEP n / 4 · LABEL`), step title, subtext, fields, action row (`← Back` ghost / `Continue →` lime).
- **Mobile (`< 768px`):** stack - shortened hero band on top, form below (equivalent to the "Focused Stage" composition). This is the PWA-friendly mobile form.
- Respect `prefers-reduced-motion` throughout.

### Hero - "Guardian Pulse" (Remotion)

- Composition `GuardianHero`, fps 30, ~90-150 frame loop. Elements: pulsing protective rings, a shield path that strokes itself in, a check that draws, lime glow on ink.
- `inputProps.variant`:
  - `'loop'` (steps 1-3): continuous ambient loop.
  - `'lock'` (Review): shield fills solid, check stamps, rings burst once and settle - the completion payoff.
- Embedded via `@remotion/player` `<Player>`: dynamic import (`ssr:false`), lazy-loaded, `controls={false}`, `autoPlay`, `loop` for the loop variant.
- **Reduced-motion fallback:** render a static `GuardianShieldStatic` SVG instead of the Player (no paused video).

## Architecture

### Routing & hard gate

- New route group `src/app/(onboarding)/` with its own full-screen `layout.tsx` (no `AppShell`/sidebar). Move onboarding here; delete `src/app/(app)/onboarding/`. URL stays `/onboarding`.
- `(onboarding)/layout.tsx` guard: no user -> `/login`; `onboarding_completed === true` -> `/` (blocks re-entry).
- `(app)/layout.tsx`: add guard `user && !onboarding_completed` -> `/onboarding` (forces new users through before the app).
- Signup action (`src/features/auth/api/actions.ts`): change post-signup `redirect("/")` -> `redirect("/onboarding")`.
- New server helper `getOnboardingStatus(userId)` reads `profiles.onboarding_completed` (not currently in the workspace snapshot). Guards live in layouts, matching the existing server-layout auth pattern (no middleware introduced).

### Theming (isolated)

- Vault tokens defined as CSS variables under a scoped wrapper class (e.g. `.vault { --vault-*: ... }`) in a colocated stylesheet. Onboarding components consume those vars. No edits to global `globals.css` `@theme`, so the dashboard/app keep the existing indigo identity.

### Animation integration

- Add deps: `remotion`, `@remotion/player`, `motion` (Framer Motion).
- Step transitions: `AnimatePresence` slide/fade between steps; staggered field entrance; button press/hover states. All gated by `prefers-reduced-motion`.

### Form & data (reuse - do not rewrite persistence)

- Reuse the existing zod schemas + `react-hook-form` from `src/features/onboarding/components/onboarding-setup.tsx` and the save path (`replaceFinancialSetup` / `saveFinancialProfileAction`) that writes `profiles` + `expenses` + `debts` + `goals` and flips `onboarding_completed`.
- **Persistence wiring:** the current onboarding saves via `FinancialStateProvider.replaceFinancialSetup()`, which lives in the `(app)` layout. Since the new onboarding is in `(onboarding)` (outside `(app)`), it calls the underlying `saveFinancialProfileAction` server action **directly** rather than depending on `FinancialStateProvider`. Same persistence logic, no provider coupling.
- Re-map the 6 existing step schemas into the 4-step grouping.
- New presentational tree under `src/features/onboarding/vault/` (small, focused files):
  - `OnboardingShell` (split layout + stepper + progress)
  - `GuardianHero` (Remotion composition) + `GuardianHeroPlayer` (lazy Player wrapper) + `GuardianShieldStatic` (reduced-motion)
  - `VaultStepper`
  - `StepIncomeSavings`, `StepCommitments` (Fixed | Debts segmented toggle), `StepGoals`, `StepReview`
  - Vault primitives: `VaultInput`, `VaultSelect`, `VaultButton`, `RepeatableRow`, `EmptyState`

### Steps & fields

1. **Income & savings** - grouped sub-blocks (You / Income / Savings):
   `fullName` · `currency` (default PHP; PHP/USD/EUR/JPY/SGD) · `payFrequency` (monthly/semi_monthly/biweekly/weekly) · `monthlyIncome` · `estimatedVariableExpenses` · `currentSavings` · `emergencyFundTarget`
2. **Commitments** - segmented toggle, both sides optional/skippable:
   - Fixed expenses rows: `label` · `amount` · `dueDay` · `isRecurring`
   - Debts rows: `label` · `outstandingBalance` · `minimumPayment` · `dueDay` · `interestRate`
3. **Goals** - optional/skippable rows: `label` · `targetAmount` · `savedAmount` · `monthlyContribution` · `targetDate` · `priority`
4. **Review** - summary of everything with jump-back-to-edit; `Confirm` -> save -> flip `onboarding_completed` -> redirect `/`.

**Skip semantics:** a user may finish with zero expenses/debts/goals; income + savings is the minimum. `onboarding_completed` flips on Review confirm regardless of list contents.

## Error Handling

- Per-step zod validation; inline vault-styled field errors.
- Save failure -> vault-styled error banner; entered data preserved (no wipe).
- Auth/guard failure -> `/login`.

## Testing

- **Unit:** 6->4 field mapping; per-step schemas; `getOnboardingStatus` redirect logic.
- **Integration:** Review confirm writes `profiles`/`expenses`/`debts`/`goals` and flips `onboarding_completed`.
- **E2E (Playwright):** new user signup -> forced to `/onboarding` -> completes 4 steps (including a skip path) -> lands on dashboard; onboarded user hitting `/onboarding` -> redirected to `/`. Follow the project e2e checklist (webServer bypasses portless, reset + serial, onboarding-first, `--port 3100`). Use reduced-motion / a test flag to render the static shield and tame Remotion in CI.
- Maintain the existing coverage gate.

## PWA-Friendliness (forward-looking, not in scope to build)

- Steps are client-rendered and degrade gracefully offline; Remotion Player is lazy and non-blocking; nothing in the shell blocks adding a web app manifest + service worker later.

## Out of Scope

- Rebranding the dashboard/app (onboarding-only).
- Changing what data the engine collects (only how it is presented/grouped).
- Building the actual PWA (manifest/service worker) - tracked separately.

## References

- Visual mockups (gitignored): `.superpowers/brainstorm/5383-1782302129/content/` - `theme-direction-v2.html`, `layout-midnight.html`, `hero-concepts.html`, `recap-final.html`.
- Existing onboarding: `src/app/(app)/onboarding/page.tsx`, `src/features/onboarding/components/onboarding-setup.tsx`.
- Save path: `src/features/financial-profile/api/save-financial-profile.ts`.
- Guards: `src/app/(app)/layout.tsx`, `src/features/auth/api/actions.ts`.
