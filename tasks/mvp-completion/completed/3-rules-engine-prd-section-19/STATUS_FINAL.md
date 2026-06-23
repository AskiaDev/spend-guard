# Milestone Status: 3 — Rules Engine PRD Section 19

## Metadata

- Feature: `mvp-completion`
- Phase: `3`
- Goal: `tasks/mvp-completion/CURRENT_GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- State: `READY FOR HUMAN REVIEW`
- Last updated: `2026-06-23 20:38`
- Updated by: `Codex`

## Current objective

Refactor the deterministic rules engine to the PRD §19 formula model while preserving existing callers.

## Current step

Phase 3 archived; ready for human review.

## Completed prior phases

- Phase 1 — Integration baseline.
- Phase 2 — Profile & schema completeness.

## Investigation findings

- The original PRD is available at `/Users/askiajamesmanjares/.claude/paste-cache/a6d8acfce2f042b2.txt`.
- PRD §19 defines raw formula functions for safe-to-spend, monthly free cash flow, emergency progress, purchase risk score, cooldown tiers, and health score.
- Existing `src/lib/calculations/purchase-decision.ts` is a single compatibility entry point and currently uses pre-PRD heuristics.
- Existing callers import `calculateCooldownDays`, `calculateFinancialHealthScore`, `calculateMonthlyFreeCashFlow`, `calculatePurchaseDecision`, and `calculateSafeToSpend` from `purchase-decision.ts`.
- Snapshot-level wrappers must derive PRD raw inputs from the current schema, which has monthly due-day fields rather than full dated schedules.

## Completed in this milestone

- Created active Phase 3 goal/status files.
- Located the authoritative PRD §19 source and extracted the exact formulas.
- Added PRD formula tests for cash flow, emergency fund, purchase risk scoring, cooldown tiers, health score, and goal impact.
- Split deterministic calculations into `cashflow`, `emergency-fund`, `debt-pressure`, `purchase-decision`, `goal-impact`, `health-score`, and `cooldown` modules.
- Preserved the existing `purchase-decision.ts` import surface for app callers.
- Added `riskScore` and `savingsAfterPurchase` to `PurchaseDecisionResult`.
- Updated public consumer expectations for PRD cooldown tiers.
- Forwarded manual and voice PRD purchase inputs into the live checker paths.
- Added persistent purchase-check input/result fields and verified the migration replay.
- Repaired independent-review findings around missing live inputs, negative-free-cash-flow financing, durable result details, debt-pressure coverage, and current-alternative inference.

## In progress

- None.

## Remaining work

- [x] Add failing PRD formula tests.
- [x] Split calculation modules and preserve compatibility exports.
- [x] Update dependent tests/callers as needed.
- [x] Run focused and full verification.
- [x] Run independent review.
- [x] Repair review findings.
- [x] Archive checkpoint patch and report.

## Files changed

| File | Status | Purpose |
| --- | --- | --- |
| `tasks/mvp-completion/CURRENT_GOAL.md` | new | Active Phase 3 goal. |
| `tasks/mvp-completion/STATUS.md` | new | Active Phase 3 status. |
| `tasks/mvp-completion/ROADMAP.md` | modified | Mark Phase 3 in progress. |
| `src/lib/calculations/cashflow.ts` | new | PRD §19.1/§19.2 raw cash-flow formulas. |
| `src/lib/calculations/cashflow.test.ts` | new | PRD cash-flow formula tests. |
| `src/lib/calculations/cooldown.ts` | new | PRD §19.5 cooldown tiers plus legacy helper signature. |
| `src/lib/calculations/cooldown.test.ts` | new | Cooldown tier boundary tests. |
| `src/lib/calculations/debt-pressure.ts` | new | Snapshot debt pressure and health-score component. |
| `src/lib/calculations/debt-pressure.test.ts` | new | Debt pressure zero-income and score tests. |
| `src/lib/calculations/emergency-fund.ts` | new | PRD §19.3 progress and snapshot emergency buffer helper. |
| `src/lib/calculations/emergency-fund.test.ts` | new | Emergency progress and buffer tests. |
| `src/lib/calculations/goal-impact.ts` | new | Goal reserve, delay, and progress helpers. |
| `src/lib/calculations/goal-impact.test.ts` | new | Goal delay/progress tests. |
| `src/lib/calculations/health-score.ts` | new | PRD §19.6 weighted score and status boundaries. |
| `src/lib/calculations/health-score.test.ts` | new | Health-score weight/status tests. |
| `src/lib/calculations/purchase-decision.ts` | modified | Compatibility entry point wired to PRD formulas and additive risk score. |
| `src/lib/calculations/purchase-decision.test.ts` | modified | Compatibility and risk-threshold tests. |
| `src/types/finance.ts` | modified | Added optional PRD purchase inputs and engine result fields. |
| `src/hooks/use-financial-state.test.tsx` | modified | Updated expected cooldown tier from PRD §19.5. |
| `src/hooks/use-financial-state.ts` | modified | Carries risk score and savings-after-purchase into saved checks. |
| `src/features/purchase-checker/api/save-purchase-check.ts` | modified | Persists PRD purchase inputs and result details. |
| `src/features/purchase-checker/api/save-purchase-check.test.ts` | modified | Covers persisted PRD inputs/results. |
| `src/features/purchase-checker/components/purchase-checker-wizard.tsx` | modified | Sends down payment, income-generating, and explicit current-alternative input to the checker. |
| `src/features/purchase-checker/components/purchase-checker-wizard.test.tsx` | modified | Covers explicit current-alternative validation and submitted PRD fields. |
| `src/features/voice/components/voice-purchase-checker.tsx` | modified | Sends reviewed down payment to the checker. |
| `src/features/voice/components/voice-purchase-checker.test.tsx` | modified | Covers voice down-payment propagation. |
| `src/features/purchase-checker/components/purchase-result.tsx` | modified | Adds result fixture fields required by the durable check type. |
| `src/features/purchase-checker/components/purchase-result.test.tsx` | modified | Adds result fixture fields required by the durable check type. |
| `src/features/dashboard/components/dashboard-overview.test.tsx` | modified | Adds saved-check fixture fields. |
| `src/app/(app)/_components/page-adapters.test.tsx` | modified | Adds saved-check fixture fields. |
| `src/lib/supabase/finance-mappers.test.ts` | modified | Updated persisted-check cooldown derivation expectation. |
| `src/lib/advisor/litert-lm.test.ts` | modified | Added new result fields to fixture. |
| `supabase/migrations/20260623001000_purchase_check_prd19_results.sql` | new | Adds durable purchase-check PRD input/result columns and constraints. |

## Decisions made

### Snapshot emergency buffer derivation

- Decision: derive snapshot emergency buffer as `min(currentSavings, emergencyFundTarget * 0.2)`.
- Reason: PRD §19.1 accepts the buffer as an input, and the PRD example states ₱24,000 savings with a ₱100,000 target protects ₱20,000.
- Alternatives rejected:
  - `80%` of target: contradicted by the PRD example.
  - `100%` of target: would make the PRD example safe-to-spend zero, not ₱4,000.
- Impact on future phases: Dashboard copy and Phase 4 result details should describe the protected buffer consistently.

### Current 30-day obligation derivation

- Decision: treat recurring monthly expenses and debt minimums as upcoming within 30 days.
- Reason: current schema only stores due-day-of-month, and Phase 7 owns richer expense/debt management.
- Alternatives rejected:
  - Date-window filtering by current calendar date: current rows lack full schedule dates and would add unstable time dependence.
- Impact on future phases: Phase 7 can add a dated helper without changing the raw PRD formulas.

## Verification status

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Focused calculation tests | `npm test -- src/lib/calculations` | PASS | included in focused and full suites |
| Public consumer tests | `npm test -- src/hooks/use-financial-state.test.tsx src/lib/supabase/finance-mappers.test.ts src/lib/advisor/fallback-advisor.test.ts src/lib/advisor/litert-lm.test.ts` | PASS | included in focused and full suites |
| Typecheck | `npm run typecheck` | PASS | `tsc --noEmit` |
| Lint | `npm run lint` | PASS | exits 0 with existing React Hook Form compiler warning in purchase wizard |
| Focused reviewer-fix suite | `npm test -- src/features/purchase-checker/components/purchase-checker-wizard.test.tsx src/lib/calculations src/lib/schemas/finance.test.ts` | PASS | 9 files / 36 tests |
| Regression suite | `npm test` | PASS | 34 files / 158 tests |
| Coverage | `npm run test:coverage` | PASS | statements 91.26%, branches 80.97%, functions 94.54%, lines 91.35% |
| Build | `npm run build` | PASS | Next.js 16 production build succeeds |
| Diff check | `git diff --check` | PASS | exits 0 |
| Scope check | `git diff --name-only` | PASS | Phase 2 files still present from previous checkpoint; Phase 3 additions limited to calculations/types/task state and dependent tests |
| Migration replay | `supabase db reset` | PASS | applied through `20260623001000_purchase_check_prd19_results.sql` |
| Schema check | `psql ... information_schema/pg_constraint query` | PASS | confirmed 6 new purchase-check columns and 3 constraints |

## Claim-to-evidence progress

| Completion claim | Status | Evidence |
| --- | --- | --- |
| PRD §19 modules implemented | VERIFIED | `npm test -- src/lib/calculations` |
| Compatibility entry point preserved | VERIFIED | focused public consumer tests + `npm run typecheck` |
| Public calculation consumers still work | VERIFIED | hook, mapper, advisor fixture tests |
| Regression suite passes | VERIFIED | `npm test` |
| No forbidden files changed | VERIFIED | `git diff --name-only`; Phase 3 needed scoped persistence/UI entrypoint changes to repair review findings |

## Review findings

### Correctness review

- State: `PASS WITH FINDINGS`
- Findings:
  - `HIGH` PRD §19 fields were not reaching manual/voice checker paths. Fixed by forwarding down payment, income-generating, and explicit current-alternative fields.
  - `MEDIUM` financed purchases with no free cash flow could return caution. Fixed with a deterministic no-free-cash-flow financing guardrail.
  - `MEDIUM` risk/result details were not durable after reload. Fixed with migration, save action, mapper, and type updates.
  - `LOW` debt-pressure zero-income branches lacked direct tests. Fixed with `debt-pressure.test.ts`.
  - `MEDIUM` current-alternative was inferred from required free text. Fixed with an explicit yes/no control and tests.

### Regression review

- State: `PASS WITH FINDINGS`
- Findings:
  - Same findings as correctness review; all repaired and verified locally.

## Blockers and open questions

None.

## Remaining risks

- Snapshot wrappers make conservative derivations from the current schema until later phases add richer purchase and dated obligation fields.
- Existing UI still does not collect every future Phase 4 purchase field such as category/location/sale deadline/notes for persistence, but it now collects or forwards the PRD §19 inputs required by the engine.
- The final narrow reviewer process returned an empty completion payload after the last repair. The earlier independent review findings were all addressed, and focused/full gates passed afterward.

## Next action

Phase 3 checkpoint archive is complete. Next invocation should select Phase 4 — Manual purchase checker completeness.

## Scope confirmation

- [x] No next-phase work started
- [x] No forbidden files modified
- [x] No unrelated refactor introduced
- [x] No tests weakened or removed
- [x] No RLS / validation bypassed
- [x] No commit, push, merge, rebase, or deployment performed

## Human review readiness

- State: `READY`

## Session handoff

For the next session: read `CURRENT_GOAL.md`, read this `STATUS.md`, inspect the current Git diff, and resume from `Next action`.
