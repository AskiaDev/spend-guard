# Milestone Report: 6 - Cooldown Completion

## Report metadata

- Feature: `mvp-completion`
- Phase: `6`
- Goal: `tasks/mvp-completion/completed/6-cooldown-completion/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- Commit: `NOT COMMITTED` (checkpoint patch only - user commits)
- Checkpoint patch: `tasks/mvp-completion/completed/6-cooldown-completion/6-cooldown-completion.patch`
- Patch SHA-256: `52ffa342d10aa7f5374c16c304e7cb5bcddc8ce4b5c1ac9b01d892fce3b3ae10`
- Base commit SHA: `e9ff291ead86529c3fb05c9bfb1303568f5e121e`
- Started: `2026-06-23`
- Finished: `2026-06-24`
- Implemented by: `Claude Code + Codex`
- Reviewed by: `Codex no-edit review`
- Outcome: `COMPLETE`

## Outcome summary

Phase 6 completes the cooldown feature. Cooldown items now persist the baseline decision, risk score, safe-to-spend, and decision-affecting purchase inputs; Recheck recomputes the deterministic PRD 19 purchase decision against the current snapshot; the card shows the stored decision and price-tier hold length; and Convert to Goal uses the existing authenticated goal action path.

All focused checks, full tests, coverage, lint, typecheck, build, local migration replay, hosted beta migration apply, and a targeted authenticated browser smoke passed. The broad E2E suite still has known stale/non-isolated assumptions outside Phase 6, so it is recorded as a non-blocking Phase 12 caveat rather than hidden.

## Original objective

> Complete the cooldown feature: surface the price-tier default cooldown, enable Recheck (recompute the PRD 19 decision against a fresh financial snapshot and report whether the decision / safe-to-spend improved since the item was added), and enable convert-to-goal - all driven by the existing deterministic engine.

### In scope

- Additive cooldown baseline/input migration.
- Pure deterministic cooldown recheck helper.
- Baseline/input persistence and mapping.
- Recheck and Convert to Goal UI enablement.
- Hook/page-adapter wiring.

### Explicitly out of scope

- P7 expenses/debts/settings CRUD.
- P8 dashboard cards.
- P9 weekly report.
- P10 LiteRT advisor.
- P11 privacy surface.
- P12 broad E2E hardening.

## Starting repository state

Before this milestone:

- P1-P5 were complete and committed on `main`.
- `cooldown_items` stored only item metadata and `recheck_at`.
- `CooldownPanel` disabled Recheck and Convert to Goal.
- `addCooldownFromCheck` used existing cooldown days but did not persist the baseline or purchase inputs needed for a later recompute.

### Existing work preserved

- PRD 19 deterministic engine outputs were not changed.
- Existing server-action auth pattern was preserved.
- Existing goal creation path was reused.

## Exploration findings

### Existing execution path

`PurchaseResult Add to Cooldown` -> `useFinancialState.addCooldownFromCheck` -> `createCooldownItemAction` -> Supabase `cooldown_items` -> `loadFinancialWorkspaceAction` -> `finance-mappers` -> `CooldownPanel`.

`CooldownPanel Convert to Goal` now calls `useFinancialState.addGoalFromCooldown` -> `createGoalAction` -> Supabase `goals` -> refresh.

### Existing architectural ownership

Financial decisions remain in `src/lib/calculations/**`. The new recheck helper is a thin orchestration layer that calls `calculatePurchaseDecision`; it does not duplicate thresholds.

### Existing public contracts

`createCooldownItemAction` remains backward-compatible by making all new fields optional. Legacy cooldown rows without a stored baseline still render and recheck with an `unknown` trend.

### Existing test conventions

Vitest + React Testing Library cover pure helpers, server actions, mappers, hooks, components, and page adapters. Targeted Playwright/Node smoke covers the authenticated public path.

### Risks identified before implementation

- Recheck could accidentally become a competing decision engine.
- Remote hosted schema could lag behind the migration.
- Broad E2E was known stale from earlier phase reports.

## Implementation design

### Chosen approach

Add one pure helper, `recheckCooldownItem`, that converts a `CooldownItem` back into `PurchaseInput`, calls `calculatePurchaseDecision(snapshot, input)`, and compares the result to the saved baseline. The UI performs recheck client-side against the already-loaded snapshot. Convert to Goal reuses `createGoalAction` through the hook.

### Reused components

- `calculatePurchaseDecision` - canonical decision engine.
- `getCooldownDays` - price-tier hold period.
- `purchaseInputSchema` - cooldown action validation base.
- `createGoalAction` - authenticated conversion path.
- `StatusBadge`, `Button`, existing card styles - UI consistency.

### New components

- `src/lib/calculations/cooldown-recheck.ts` - deterministic recheck helper.
- `supabase/migrations/20260623003000_cooldown_recheck_baseline.sql` - additive columns/constraints.

### Alternatives rejected

#### Persist recheck history

- Reason rejected: explicitly out of scope; recheck is a read-only recompute.
- Risk avoided: expanding Phase 6 into report/history work.

#### Delete cooldown item after conversion

- Reason rejected: not specified and would surprise users.
- Risk avoided: destructive UI behavior without product approval.

### Architectural invariants preserved

- No PRD 19 engine output files changed.
- No LLM path can influence cooldown decisions.
- Server actions still derive `user_id` from Supabase Auth.
- Migration is additive and rollback SQL is documented.

## Behavior implemented

### Baseline persistence

Cooldown item creation now accepts and persists down payment, installment months, monthly payment, income-generating flag, current-alternative flag, baseline decision, baseline risk score, and baseline safe-to-spend.

Evidence:

- `src/features/cooldown/api/create-cooldown-item.test.ts`
- `supabase db reset`
- `supabase db push --yes`

### Deterministic recheck

`recheckCooldownItem(item, snapshot)` recomputes the current decision from the deterministic engine, compares decision rank to the baseline, returns safe-to-spend delta, and handles missing legacy baselines as `unknown`.

Evidence:

- `src/lib/calculations/cooldown-recheck.test.ts`
- `src/features/cooldown/components/cooldown-panel.test.tsx`
- targeted cooldown browser smoke

### Cooldown UI completion

The cooldown card now shows price-tier hold length, uses the stored baseline decision badge, enables Recheck, renders the recomputed result/trend, and enables Convert to Goal.

Evidence:

- `src/features/cooldown/components/cooldown-panel.test.tsx`
- targeted cooldown browser smoke

### Convert to Goal

`addGoalFromCooldown` mirrors the accepted Phase 5 conversion pattern and routes through `createGoalAction`.

Evidence:

- `src/hooks/use-financial-state.test.tsx`
- `src/app/(app)/_components/page-adapters.test.tsx`
- targeted cooldown browser smoke

### Error and edge-case behavior

- Invalid cooldown payloads reject before auth/database access.
- Legacy cooldown rows without baselines recheck with `unknown` trend and no delta.
- Conversion failures propagate through the existing goal action error path.
- Recheck does not mutate or persist the item.

## Files changed

| File | Change | Purpose |
| --- | --- | --- |
| `supabase/migrations/20260623003000_cooldown_recheck_baseline.sql` | new | Add baseline/input cooldown columns and constraints |
| `src/types/database.ts` | modified | Database row/insert types |
| `src/types/finance.ts` | modified | Cooldown app model fields |
| `src/lib/calculations/cooldown-recheck.ts` | new | Pure recheck helper |
| `src/lib/calculations/cooldown-recheck.test.ts` | new | Recheck behavior coverage |
| `src/features/cooldown/api/create-cooldown-item.ts` | modified | Persist baseline/input fields |
| `src/features/cooldown/api/create-cooldown-item.test.ts` | new | Action coverage |
| `src/lib/supabase/finance-mappers.ts` | modified | Map new cooldown fields |
| `src/lib/supabase/finance-mappers.test.ts` | modified | Mapper coverage |
| `src/hooks/use-financial-state.ts` | modified | Add cooldown-to-goal and richer cooldown payload |
| `src/hooks/use-financial-state.test.tsx` | modified | Scope exception for hook conversion coverage |
| `src/features/cooldown/components/cooldown-panel.tsx` | modified | Recheck/convert UI |
| `src/features/cooldown/components/cooldown-panel.test.tsx` | modified | Component public path coverage |
| `src/app/(app)/_components/page-adapters.tsx` | modified | Pass snapshot/callback |
| `src/app/(app)/_components/page-adapters.test.tsx` | modified | Adapter coverage |

### Files intentionally not changed

- `src/lib/calculations/purchase-decision.ts` - PRD 19 outputs are frozen.
- `src/lib/calculations/cashflow.ts`, `emergency-fund.ts`, `debt-pressure.ts`, `goal-impact.ts`, `health-score.ts` - not needed for Phase 6.
- P7-P12 routes/features - not started.

### Scope exceptions

| File | Why it became necessary | Human approval |
| --- | --- | --- |
| `src/hooks/use-financial-state.test.tsx` | Required to prove `addGoalFromCooldown` routes through `createGoalAction`, which the Phase 6 public-path criteria require | not separately requested; phase-local test |

## Database and migration changes

### Migrations added

- `supabase/migrations/20260623003000_cooldown_recheck_baseline.sql`

### Apply verification

```bash
supabase db reset
```

Result:

```text
PASS - all local migrations applied through 20260623003000_cooldown_recheck_baseline.sql
```

Hosted beta verification:

```bash
supabase db push --dry-run
supabase db push --yes
```

Result:

```text
PASS - dry run showed only Phase 6 pending; push applied 20260623003000_cooldown_recheck_baseline.sql
```

### Rollback verification

Rollback SQL is documented in the migration comments. It was inspected and the patch reverse-check passed; rollback SQL was not executed against the hosted beta database.

### Data-safety evidence

- New columns are nullable or defaulted.
- Constraints validate baseline decision/risk range and nonnegative amounts.
- RLS policies are unchanged and still rely on existing per-user policies.
- Temporary hosted beta smoke rows were cleaned up; direct query returned `goals=0 cooldown=0` for the smoke prefix.

## Tests added or changed

| Test | Coverage |
| --- | --- |
| `src/lib/calculations/cooldown-recheck.test.ts` | improved/unchanged/worsened/unknown, delta, input conversion, determinism, cooldown tiers |
| `src/features/cooldown/api/create-cooldown-item.test.ts` | authenticated insert, omitted optional fields, invalid input, insert failure, scoped delete |
| `src/features/cooldown/components/cooldown-panel.test.tsx` | price-tier hold, stored badge decision, recheck render, legacy baseline, convert click |
| `src/lib/supabase/finance-mappers.test.ts` | new cooldown columns and legacy null defaults |
| `src/app/(app)/_components/page-adapters.test.tsx` | snapshot and convert callback wiring |
| `src/hooks/use-financial-state.test.tsx` | cooldown-to-goal success/failure through goal action |

### Coverage boundaries

- Broad `e2e/spendguard.spec.ts` remains stale/non-isolated and belongs to P12.
- Rollback SQL was documented but not executed against hosted beta.

## Verification results

### Focused checks

| Check | Command | Result |
| --- | --- | --- |
| Phase 6 focused suite | `npm test -- src/lib/calculations/cooldown-recheck.test.ts src/features/cooldown/components/cooldown-panel.test.tsx src/features/cooldown/api/create-cooldown-item.test.ts src/lib/supabase/finance-mappers.test.ts "src/app/(app)/_components/page-adapters.test.tsx"` | PASS, 5 files / 35 tests |
| Hook seam | `npm test -- src/hooks/use-financial-state.test.tsx` | PASS, 1 file / 5 tests |

### Public-path or integration checks

| Check | Command | Result |
| --- | --- | --- |
| Targeted cooldown browser smoke | Node/Playwright smoke against `127.0.0.1:3100` with hosted beta Supabase | PASS |
| Broad E2E suite | user-provided `npm run e2e -- e2e/spendguard.spec.ts` with E2E credentials | FAIL, 1 passed / 2 failed due stale/non-Phase-6 assumptions |

### Regression checks

| Check | Command | Result |
| --- | --- | --- |
| Full suite | `npm test` | PASS, 37 files / 190 tests |
| Lint | `npm run lint` | PASS, 0 errors / 271 warnings |
| Typecheck | `npm run typecheck` | PASS |
| Coverage | `npm run test:coverage` | PASS, 90.78 statements / 81.85 branches / 94.51 functions / 90.84 lines |
| Build | `npm run build` | PASS |

### Diff and scope checks

| Check | Command | Result |
| --- | --- | --- |
| Diff formatting | `git diff --check` | PASS |
| Changed files | `git diff --name-only` + untracked inspection | PASS WITH FINDINGS |
| Checkpoint patch | `shasum -a 256 tasks/mvp-completion/completed/6-cooldown-completion/6-cooldown-completion.patch` | PASS |
| Patch reversibility | `git apply --reverse --check tasks/mvp-completion/completed/6-cooldown-completion/6-cooldown-completion.patch` | PASS |

### Unrelated or environment-blocked checks

| Check | Reason | Impact |
| --- | --- | --- |
| Broad E2E as completion gate | Desktop spec is stale at the purchase wizard; mobile onboarding spec uses an already-onboarded account | Not blocking Phase 6 because targeted cooldown public path passed; Phase 12 owns hardening |
| Clean whole-worktree scope | Existing unrelated dirty files are present | Phase 6 checkpoint patch excludes them |

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Recheck recomputes decision vs fresh snapshot + reports trend | focused tests + targeted browser smoke | VERIFIED |
| Price-tier cooldown surfaced; recheck date derived | panel tests + targeted browser smoke | VERIFIED |
| Convert-to-goal works end to end | hook/panel/adapter tests + targeted browser smoke | VERIFIED |
| Baseline persisted + mapped; legacy rows degrade | action/mapper tests + migration replay | VERIFIED |
| Engine outputs unchanged | scoped diff review; no forbidden engine output files changed | VERIFIED |
| Deterministic; LLM never decides | recheck tests and code review | VERIFIED |
| No forbidden files changed by Phase 6 patch | checkpoint patch review | VERIFIED |
| Migration additive + reversible | migration SQL, local reset, hosted push, rollback comments | VERIFIED |
| Diff structurally valid | `git diff --check` | VERIFIED |

## Acceptance-criteria results

- [x] **Price-tier cooldown period is derived and surfaced** - `getCooldownDays` drives `addCooldownFromCheck`, `recheckCooldownItem`, and card display; tested in helper/panel/browser smoke.
- [x] **Recheck recomputes decision against current snapshot and reports trend/delta** - implemented in `cooldown-recheck.ts`; tested and smoke-verified.
- [x] **Card badge shows real stored baseline decision** - panel uses `baselineDecision` when present; tested.
- [x] **Convert to Goal creates a goal through existing action path** - hook/panel/adapter tests and browser smoke pass.
- [x] **Legacy rows degrade gracefully** - missing baseline returns `unknown` trend and null delta; tested.
- [x] **Deterministic, no LLM influence** - pure helper uses deterministic engine only; tested.
- [x] **Migration additive and replayed** - local reset and hosted beta push pass.

## Independent review

### Correctness review

- Reviewer: `Codex no-edit review`
- Verdict: `PASS`

Findings:

- No blocking correctness issue found.

### Regression review

- Reviewer: `Codex no-edit review`
- Verdict: `PASS WITH FINDINGS`

Findings:

- `MINOR` Broad E2E suite remains stale/non-isolated. Resolution: documented; Phase 12 owns it.
- `MINOR` Out-of-scope dirty files exist in the worktree. Resolution: checkpoint patch excludes them.

### Simplification review

- Reviewer: `Codex no-edit review`
- Verdict: `PASS`

Findings:

- No duplicate decision engine, no unnecessary persistence loop, no unrelated UI redesign.

## Repair history

### Remote schema cache missing Phase 6 columns

- Failing check: targeted cooldown smoke setup insert.
- Root cause: hosted beta schema had not received the Phase 6 migration.
- Correction: `supabase db push --dry-run`, then `supabase db push --yes`.
- Final result: targeted cooldown smoke passed.

### Stale dev server on port 3100

- Failing check: user-provided broad E2E command and initial smoke.
- Root cause: orphaned/wedged Next dev process on the Playwright port.
- Correction: stopped the repo-local dev process and started a fresh dev server.
- Final result: targeted cooldown smoke passed; broad E2E still failed for stale spec assumptions.

## Deviations from the original goal

- Hosted beta migration was applied during this run because the user explicitly instructed Codex to use remote beta data and the remote public-path smoke required the new columns.
- `src/hooks/use-financial-state.test.tsx` was added as a phase-local scope exception to prove the new hook seam.

## Remaining risks and limitations

- Broad E2E suite still needs Phase 12 updates for current wizard fields and isolated account state.
- Unrelated worktree changes remain outside the Phase 6 patch.
- Hosted beta rollback was not executed; rollback SQL is documented in the migration.

## Follow-up work

- Phase 7: expenses/debts/settings management.
- Phase 12: broad Playwright suite hardening.

## Guidance for the next milestone

The next milestone may rely on:

- `CooldownItem` baseline/input fields.
- `recheckCooldownItem(item, snapshot)`.
- `useFinancialState.addGoalFromCooldown`.
- Hosted beta schema containing Phase 6 cooldown columns.

The next milestone must not assume:

- Broad `e2e/spendguard.spec.ts` is current.
- Recheck history is persisted.
- Convert to Goal removes the cooldown item.

### Recommended next milestone

`7 - Expenses / Debts / Settings management` - it is the next pending roadmap phase after completed serial-spine Phase 6.

## Human review checklist

- [ ] Review the Phase 6 checkpoint patch.
- [ ] Confirm the hosted beta migration is acceptable.
- [ ] Confirm targeted cooldown browser smoke is acceptable public-path evidence.
- [ ] Confirm broad E2E failure remains deferred to Phase 12.
- [ ] Confirm unrelated dirty files are outside this phase.

## Git and deployment status

- Commit created by agent: `NO`
- Git pushed by agent: `NO`
- Merged by agent: `NO`
- Deployed by agent: `NO`
- Hosted beta schema modified: `YES` - additive Phase 6 Supabase migration applied after user instruction
- Temporary hosted beta data retained: `NO` - smoke rows cleaned up

## Final disposition

- Agent recommendation: `READY FOR HUMAN REVIEW`
- Human decision: `PENDING`
- Human reviewer: `pending`
- Decision date: `pending`
