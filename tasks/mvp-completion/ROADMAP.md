# Roadmap: SpendGuard — MVP Completion (PRD gap closure)

> Execution tracker for `run-feature-roadmap`. Materialized from the SpendGuard PRD
> ("Can I Buy This?") — MVP scope, PRD §11 features + §19 rules engine + §22–25 data/validation.
> The PRD is the authoritative scope/DoD source; this file is the ordered execution tracker.
>
> - **Planning root:** this repo's `tasks/` tree (templates + this feature dir). Nothing is built here.
> - **Code root:** `/Users/askiajamesmanjares/Documents/GitHub/personal/spend-guard` (git repo).
> - **Branch:** `main`.
> - **Invoke with:** `/run-feature-roadmap tasks/mvp-completion`

## Locked decisions (answered before authoring this roadmap)

1. **Baseline = merge redesign → main first.** Before running this roadmap, the user merges
   `feat/spendguard-redesign` (commit `a4ee0a3`, the latest routed UI / app shell / wizard checker /
   voice / design system) into `main` (commit `e1f4c77` + the in-progress Supabase wiring), resolves
   conflicts, and commits. That merged tree — **redesign UI + Supabase persistence as source of
   truth** — is the baseline. Phase 1 below verifies and repairs that baseline; it does not perform
   the git merge (hard git boundary — the user commits/merges).
2. **Rules engine = align to the PRD's §19 formulas.** Phase 3 refactors `src/lib/calculations/**`
   to the PRD's deterministic model (protected safe-to-spend, additive risk score, upcoming-debt
   within 30 days, installment pressure, goal reserve, §19.6 health-score weights). Reason: the
   current `safe-to-spend = savings + freeCashFlow/4` diverges from the PRD's protect-the-buffer
   model and can call committed money "spendable" — unacceptable in a purchase-guardrail app.

## Required precondition (human, before invoking the skill)

- [ ] `git checkout main && git merge feat/spendguard-redesign` (or rebase), resolve the known
      conflict files (`src/app/page.tsx`, `src/app/spendguard-client.tsx`,
      `e2e/spendguard.spec.ts`, `src/features/onboarding/components/onboarding-setup.test.tsx`,
      `purchase-checker-panel.tsx` ↔ new `purchase-checker-wizard.tsx`), commit.
- [ ] Confirm `local-database.ts` removal vs the redesign's Dexie usage is reconciled in favor of
      Supabase persistence (Dexie may remain only as an explicit offline/local fallback if desired).
- [ ] `npm install` clean; `.env.local` has Supabase URL + anon key; `supabase db reset` applies both
      existing migrations.

If the merged tree does not build or its tests are red, that is Phase 1's job to surface and repair —
not a reason to skip the merge.

## Serial spine vs. parallel

- Serial spine: **P1 → P2 → P3 → P4 → P6 → P11 → P12**
- Parallelizable after P3: **P5** (goals) ∥ **P7** (expenses/debts/settings) ∥ **P8** (dashboard).
- Parallelizable after P3: **P9** (weekly report) ∥ **P10** (LiteRT advisor).
- P3 (engine) is the keystone — most feature phases depend on its verified seams.

## Phase cap note

This roadmap lists **12** phases; `run-feature-roadmap` executes at most **10 phases per
invocation**. Expect to invoke it **twice** (P1–P10, then P11–P12), or pass an explicit higher cap.

## Phases

| #  | Phase | PRD § | Status | Depends | Gap / scope notes |
|----|-------|-------|--------|---------|-------------------|
| 1  | Integration baseline: verify + repair the merged tree | §16, §31 | ⏳ PENDING | merge (human) | Redesign UI and Supabase wiring lived on different branches. Verify the merged baseline: `build` + `typecheck` + `lint` + `npm test` + the e2e onboarding spec all green; repair seams where `use-financial-state` ↔ server actions ↔ `finance-mappers` ↔ Supabase disagree; confirm `load-financial-workspace` loads a real workspace and `local-database.ts` removal didn't orphan callers. No new features. Establishes the trusted "done" baseline. |
| 2  | Profile & schema completeness | §11.1, §22.1 | ⏳ PENDING | P1 | `profiles` is missing `pay_frequency`, `estimated_variable_expenses`, `onboarding_completed`, `full_name` (PRD §22.1); onboarding wizard never collects pay frequency or variable spending. Add migration (additive + rollback), extend onboarding fields + Zod, persist them, and gate the "redirect completed users to dashboard" on `onboarding_completed`. Unblocks correct cash-flow + safe-to-spend inputs. |
| 3  | Rules engine → PRD §19 deterministic model | §4, §19 | ⏳ PENDING | P2 | **Keystone.** Refactor `src/lib/calculations/**` to PRD §19: `calculateSafeToSpend` = savings − emergencyBuffer − upcomingBills30Days − upcomingDebt30Days − reservedGoalAmount (≥0); `calculateMonthlyFreeCashFlow` with estimated variable expenses + min debt payments; `calculateEmergencyFundProgress`; `evaluatePurchase` additive **risk-score** model (§19.4) → SAFE_TO_BUY/BUY_WITH_CAUTION/WAIT/NOT_RECOMMENDED at the §19.4 thresholds, incl. down payment in savings-after, installment pressure, want/alternative/income-generating adjustments; `getCooldownDays` price tiers (§19.5); `calculateHealthScore` §19.6 weights; `goal-impact` delay. Pure, exhaustively unit-tested incl. exact threshold ties (75/50/30). Split into the PRD's `cashflow / emergency-fund / debt-pressure / purchase-decision / goal-impact / health-score / cooldown` modules. The LLM must never alter these outputs. |
| 4  | Manual purchase checker completeness | §11.3, §27.3 | ⏳ PENDING | P3 | Wizard is missing PRD fields: `category`, `saleDeadline`, `location`, `notes`, and `downPayment` is "reference-only" (must feed P3's savings-after). Result must surface: decision, risk score, savings-after-purchase, EF impact, debt conflict, goal-delay months, cooldown recommendation, reasons, recommended next action, advisor text. Add `mark as bought` / `mark as skipped`; wire check history to Supabase via the existing action. |
| 5  | Goal planner completion | §11.5, §13(Story 5), §27.5 | ⏳ PENDING | P3 | Goal **creation UI is disabled** ("coming soon"); `createGoalAction` exists but is unwired; "Convert to goal" from a check is disabled. Enable goal CRUD UI; compute estimated completion date, needed monthly + **per-payday** contribution (uses `pay_frequency` from P2), realistic-or-not flag; show goal impact during purchase checks; enable convert-purchase-to-goal end to end. |
| 6  | Cooldown completion | §11.6, §27.6 | ⏳ PENDING | P3, P4 | `Recheck` and `Convert to goal` are disabled; no "did your status improve" indicator; default days not derived from price tier. Apply §11.6/§19.5 default cooldown by price; `Recheck` recomputes the decision against a fresh snapshot and reports whether safe-to-spend / decision improved since added; enable convert-to-goal. |
| 7  | Expenses / Debts / Settings management | §11.1, §13(Story 1), §14 | ⏳ PENDING | P2 | PRD §14 routes `/expenses`, `/debts`, `/settings` do not exist; expenses/debts are only set at onboarding with **no edit-later path** (PRD §11.1 "User can edit all values later"). Add update/delete server actions (auth + Zod + RLS) and the three routes: expense CRUD, debt CRUD (incl. due dates feeding P3's 30-day window), and settings (currency, profile edit, delete-my-data). |
| 8  | Dashboard completeness | §11.2, §27.2 | ⏳ PENDING | P3, P2 | Dashboard lacks the **upcoming-debt-within-30-days** card/alert and does not surface estimated variable expenses; advisor summary is partly static. Wire all PRD §11.2 cards to live deterministic metrics from P3, including the 30-day debt window and the strong/stable/caution/risky status banner. |
| 9  | Weekly advisor report from real metrics | §11.7, §13(Story 6) | ⏳ PENDING | P3 | Report insights are static placeholders. Generate wins / risks / recommendations / one next-best-action from real deterministic metrics + the week's purchase-check + cooldown history; store + show history; **rule-based fallback** narrative when the LLM is unavailable (report must work without AI). |
| 10 | LiteRT-LM advisor — real integration | §11.8, §20.5, §21 | ⏳ PENDING | P3 | Advisor is a stub (`window.LiteRTLM?.generateText`); only the deterministic fallback works. Implement the engine/model loader, prompt builder (§21 system + template), streaming explanation, robust fallback wiring, and transcript→structured-fields extraction via LiteRT (§20.5) with the existing regex parser as fallback; include one educational lesson. Invariant: the LLM explains, never overrides, the §19 decision. |
| 11 | Privacy & safety surface | §28, §11.8 | ⏳ PENDING | P1 (navigable app) | No explicit financial **disclaimer** text (PRD §28 exact string), no voice-privacy note surfaced, no delete-transcript / delete-data control. Add the disclaimer component on relevant screens, the voice privacy note, transcript + account-data deletion, and a cross-user RLS denial test proving isolation. |
| 12 | E2E & coverage hardening | §15, §30 | ⏳ PENDING | P4–P11 | Lock the critical journeys with Playwright: onboarding → dashboard, manual check → decision → convert-to-goal, voice check → confirm → decision, cooldown recheck, weekly report, and **auth/protected-route redirect** (verify unauthenticated users are bounced — confirm middleware exists or add it). Ensure the repo's 80% Vitest coverage gate passes across the new code. |

## Global Definition of Done (every phase)

- Lands as its own reversible change; **the user reviews and commits — no agent-run git writes.**
  Capture each finished phase as a patch in `completed/<n>-<name>/<name>.patch` (record SHA-256 + base SHA in the report).
- `npm run typecheck` clean, `npm run lint` clean, focused `npm test` green, and the **public path is
  exercised** (component/server-action/e2e — not just pure helpers).
- The **deterministic rules engine stays the single source of decisions**; the LLM advisor only
  explains. Any phase that lets the LLM change a decision is a failure.
- **Server actions** check the authenticated user and derive `user_id` from Supabase Auth; **RLS**
  isolation is preserved (never trust client `user_id`).
- DB changes are additive + reversible (ship a documented rollback; verify with `supabase db reset`).
- **UI-bearing phases** invoke the `frontend-design` skill before writing UI and verify the real page
  via Playwright (snapshot + interaction), not just `next build`.
- **Independent review** every phase (read-only subagent or a `*-reviewer` agent); fix BLOCKING /
  IMPORTANT findings before the phase is done.
- Coverage holds at ≥ 80% (`npm run test:coverage`). No silent caps: any truncation/sampling is logged.
- Read `node_modules/next/dist/docs/` before writing Next-specific code (Next 16 / React 19 — per `AGENTS.md`).
- Scope held: no next-phase work; no MVP-out-of-scope items (bank links, investment advice, CSV import,
  receipt OCR, transactions tracker — PRD §8 / §12).

## Status legend

- ✅ DONE — verified by executed tests + independent review, archived under `completed/`
- ⏳ PENDING — not started
- 🚧 IN PROGRESS — active phase (see `STATUS.md`)
- ⛔ BLOCKED — see `STATUS.md`
- 🟡 PARTIAL — useful work landed but goal not fully proven (see report)
