# Milestone Status: 6 - Cooldown completion

## Metadata

- Feature: `mvp-completion`
- Phase: `6`
- Goal: `tasks/mvp-completion/CURRENT_GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- State: `READY FOR HUMAN REVIEW`
- Last updated: `2026-06-24 02:20`
- Updated by: `Codex`

## Current objective

Complete the cooldown feature: surface price-tier cooldowns, enable deterministic Recheck, persist baseline fields, and enable Convert to Goal.

## Current step

Implementation, verification, review, remote beta migration, targeted browser smoke, and checkpoint patch are complete. Awaiting human review.

## Completed prior phases

- P1 integration baseline
- P2 profile/schema completeness
- P3 PRD 19 deterministic rules engine
- P4 manual purchase checker completeness
- P5 goal planner completion

## Investigation findings

- Existing Phase 6 work was already partially present in the working tree when Codex resumed.
- The implementation extends the existing cooldown action, mapper, hook, and panel seams instead of adding a parallel flow.
- The broad `e2e/spendguard.spec.ts` still has known stale/non-isolated assumptions from earlier reports; it is not a clean Phase 6 gate.
- The hosted beta Supabase project was missing the Phase 6 migration until this run. `supabase db push --dry-run` showed only `20260623003000_cooldown_recheck_baseline.sql`, and `supabase db push --yes` applied it.
- Out-of-scope dirty files existed before final checkpointing (`CLAUDE.md`, `package.json`, `.agents/`, `.claude/`, `.codex/`, Supabase temp files). They are excluded from the Phase 6 patch.

## Completed in this milestone

- Added additive cooldown baseline/input migration with rollback comments.
- Extended cooldown DB and app types with decision baseline and decision-affecting purchase fields.
- Added `cooldown-recheck.ts` pure helper that converts a cooldown item to purchase input, recomputes the deterministic decision from the current snapshot, and reports trend/delta.
- Persisted baseline fields in `createCooldownItemAction` and mapped them through `finance-mappers`.
- Enriched `addCooldownFromCheck` to use price-tier cooldown days and persist the baseline/input fields.
- Added `addGoalFromCooldown` through the existing `createGoalAction` path.
- Enabled Recheck and Convert to Goal in `CooldownPanel`; card badges use stored baseline decisions when present and show price-tier hold length.
- Wired `CooldownPageContent` to pass snapshot and convert callback.
- Added focused tests for the recheck helper, cooldown action, mapper, panel, page adapter, and hook conversion seam.

## In progress

- None.

## Remaining work

- [x] Migration: add baseline + input columns to `cooldown_items`.
- [x] `database.ts` + `finance.ts` types for the new columns.
- [x] `cooldown-recheck.ts` pure helper + exhaustive tests.
- [x] Persist new fields in `createCooldownItemAction`; map them in `finance-mappers`.
- [x] `addCooldownFromCheck` richer payload; `addGoalFromCooldown` hook callback.
- [x] `CooldownPanel`: enable Recheck/Convert, real badge, price-tier period.
- [x] `page-adapters` wiring.
- [x] Regression + lint + coverage + build; migration replay; independent review; report; checkpoint patch.
- [ ] Human diff review.

## Files changed

| File | Status | Purpose |
| --- | --- | --- |
| `supabase/migrations/20260623003000_cooldown_recheck_baseline.sql` | new | Add cooldown baseline/input columns and rollback notes |
| `src/types/database.ts` | modified | Add cooldown DB columns |
| `src/types/finance.ts` | modified | Add `CooldownItem` baseline/input fields |
| `src/lib/calculations/cooldown-recheck.ts` | new | Pure deterministic cooldown recheck helper |
| `src/lib/calculations/cooldown-recheck.test.ts` | new | Recheck trend, delta, conversion, determinism tests |
| `src/features/cooldown/api/create-cooldown-item.ts` | modified | Validate and persist new cooldown fields |
| `src/features/cooldown/api/create-cooldown-item.test.ts` | new | Authenticated insert and validation tests |
| `src/lib/supabase/finance-mappers.ts` | modified | Map new cooldown columns with legacy defaults |
| `src/lib/supabase/finance-mappers.test.ts` | modified | Mapper baseline/input coverage |
| `src/hooks/use-financial-state.ts` | modified | Add cooldown-to-goal and richer add-cooldown payload |
| `src/hooks/use-financial-state.test.tsx` | modified | Scope exception: direct hook coverage for cooldown-to-goal success/failure |
| `src/features/cooldown/components/cooldown-panel.tsx` | modified | Enable Recheck/Convert and surface price-tier/baseline UI |
| `src/features/cooldown/components/cooldown-panel.test.tsx` | modified | Public component path coverage |
| `src/app/(app)/_components/page-adapters.tsx` | modified | Pass snapshot and conversion callback |
| `src/app/(app)/_components/page-adapters.test.tsx` | modified | Adapter prop coverage |

## Decisions made

### Convert-to-goal keeps cooldown item

- Decision: conversion creates a goal and keeps the cooldown item.
- Reason: mirrors existing `addGoalFromCheck`; silent deletion is not specified by the PRD.
- Alternatives rejected: delete or reset the cooldown item during conversion.
- Impact on future phases: if product wants auto-removal, it should be a separate explicit change.

### Hosted beta migration applied

- Decision: applied `20260623003000_cooldown_recheck_baseline.sql` to the hosted Supabase project.
- Reason: user explicitly instructed this run to use the remote beta data; targeted Phase 6 public-path smoke required the new columns.
- Alternatives rejected: use only local Supabase for browser smoke after user instruction.
- Impact on future phases: hosted beta schema now includes Phase 6 cooldown columns.

## Verification status

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Focused Phase 6 suite | `npm test -- src/lib/calculations/cooldown-recheck.test.ts src/features/cooldown/components/cooldown-panel.test.tsx src/features/cooldown/api/create-cooldown-item.test.ts src/lib/supabase/finance-mappers.test.ts "src/app/(app)/_components/page-adapters.test.tsx"` | PASS | 5 files / 35 tests |
| Hook seam | `npm test -- src/hooks/use-financial-state.test.tsx` | PASS | 1 file / 5 tests |
| Typecheck | `npm run typecheck` | PASS | exit 0 |
| Lint | `npm run lint` | PASS | 0 errors, 271 warnings from local skill bundles and existing React Hook Form compiler warning |
| Regression suite | `npm test` | PASS | 37 files / 190 tests |
| Coverage (>=80%) | `npm run test:coverage` | PASS | statements 90.78%, branches 81.85%, functions 94.51%, lines 90.84% |
| Build | `npm run build` | PASS | Next 16 build, 12 app routes + proxy |
| Local migration replay | `supabase db reset` | PASS | applied through `20260623003000_cooldown_recheck_baseline.sql` |
| Remote migration dry run | `supabase db push --dry-run` | PASS | one pending migration: Phase 6 |
| Remote migration apply | `supabase db push --yes` | PASS | applied Phase 6 migration |
| Broad E2E | user-provided `E2E_SUPABASE_EMAIL=... E2E_SUPABASE_PASSWORD=... npm run e2e -- e2e/spendguard.spec.ts` | FAIL | 1 passed / 2 failed due stale wizard/onboarding assumptions outside Phase 6 |
| Targeted cooldown browser smoke | Node/Playwright authenticated smoke against `127.0.0.1:3100` + hosted beta Supabase | PASS | seeded temp cooldown, verified Recheck, Convert to Goal, `/goals`, cleaned rows |
| Remote cleanup | direct PostgREST query | PASS | `REMOTE_CLEANUP goals=0 cooldown=0` |
| Diff check | `git diff --check` | PASS | exit 0 |
| Checkpoint reverse-check | `git apply --reverse --check tasks/mvp-completion/completed/6-cooldown-completion/6-cooldown-completion.patch` | PASS | patch matches current phase files |
| Scope check | `git status --short` + scoped patch review | PASS WITH FINDINGS | phase patch excludes pre-existing out-of-scope dirty files |

## Claim-to-evidence progress

| Completion claim | Status | Evidence |
| --- | --- | --- |
| Recheck recomputes decision vs fresh snapshot + reports trend | VERIFIED | `cooldown-recheck.test.ts`, `cooldown-panel.test.tsx`, targeted browser smoke |
| Price-tier cooldown surfaced; recheck date derived | VERIFIED | `cooldown-panel.test.tsx`, targeted browser smoke |
| Convert-to-goal works end to end | VERIFIED | `cooldown-panel.test.tsx`, `use-financial-state.test.tsx`, targeted browser smoke |
| Baseline persisted + mapped; legacy rows degrade | VERIFIED | `create-cooldown-item.test.ts`, `finance-mappers.test.ts`, migration replay |
| Engine outputs unchanged (no PRD 19 edits) | VERIFIED | `git diff --name-only` scoped review; no forbidden calculation files modified |
| Deterministic; LLM never decides | VERIFIED | `cooldown-recheck.test.ts`; no LLM path involved |
| No forbidden files changed by Phase 6 patch | VERIFIED | scoped checkpoint patch review |
| Migration additive + reversible | VERIFIED | migration rollback comments, `supabase db reset`, remote dry-run/apply |
| Diff structurally valid | VERIFIED | `git diff --check` |

## Review findings

### Correctness review

- State: `PASS`
- Findings:
  - None blocking. Recheck uses the existing deterministic engine; conversion uses existing goal action.

### Regression review

- State: `PASS WITH FINDINGS`
- Findings:
  - `MINOR` Broad `e2e/spendguard.spec.ts` remains stale/non-isolated: desktop purchase does not reach Payment, and mobile onboarding assumes an already-onboarded account should see onboarding. Resolution: documented; Phase 12 owns broad E2E hardening. Targeted Phase 6 browser smoke passed.
  - `MINOR` Out-of-scope dirty files remain in the worktree. Resolution: excluded from the Phase 6 checkpoint patch.

### Simplification review

- State: `PASS`
- Findings:
  - No duplicate rules engine, no recheck persistence loop, and no unrelated UI redesign introduced.

## Repair attempts

### E2E port/server stall

- Failing command: user-provided E2E command.
- Attempt count: `2`
- Relevant error: port 3100 already in use, then stale dev server timed out.
- Root-cause hypothesis: orphaned/wedged Next dev process on the Playwright port.
- Repairs attempted:
  1. tried reuse-existing-server config; server timed out.
  2. stopped the stale repo-local dev server and reran the command.
- Result: command executed; broad E2E had known test failures unrelated to Phase 6.

### Remote schema cache missing Phase 6 column

- Failing command: targeted cooldown smoke setup insert.
- Attempt count: `1`
- Relevant error: hosted schema did not have `cooldown_items.baseline_decision`.
- Root-cause hypothesis: Phase 6 migration had only been replayed locally.
- Repairs attempted:
  1. ran `supabase db push --dry-run`, then `supabase db push --yes` after confirming only Phase 6 was pending.
- Result: targeted cooldown smoke passed.

## Blockers and open questions

None.

## Remaining risks

- Broad Playwright suite still needs Phase 12 hardening for current wizard/onboarding assumptions.
- Worktree contains unrelated dirty files that were not authored or included in the Phase 6 patch.
- Hosted beta schema was changed by applying an additive migration per user instruction.

## Next action

Human should review `tasks/mvp-completion/completed/6-cooldown-completion/6-cooldown-completion.patch`, confirm the remote beta migration is acceptable, then proceed to Phase 7.

## Scope confirmation

- [x] No next-phase work started
- [x] No forbidden files modified by the Phase 6 patch
- [x] No unrelated refactor introduced by this phase
- [x] No tests weakened or removed
- [x] No RLS / validation bypassed
- [x] No commit, git push, merge, rebase, or deployment performed

## Human review readiness

- State: `READY WITH KNOWN RISKS`

## Session handoff

For the next session: (1) read archived Phase 6 report; (2) preserve the Phase 6 patch; (3) ignore or separately resolve unrelated worktree dirt; (4) begin Phase 7 only after human review accepts Phase 6 or explicitly asks to continue.
