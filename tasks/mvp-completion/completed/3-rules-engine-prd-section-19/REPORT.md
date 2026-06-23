# Milestone Report: 3 — Rules Engine PRD Section 19

## Report metadata

- Feature: `mvp-completion`
- Phase: `3`
- Goal: `tasks/mvp-completion/completed/3-rules-engine-prd-section-19/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- Commit: `NOT COMMITTED` (checkpoint patch only — user commits)
- Checkpoint patch: `tasks/mvp-completion/completed/3-rules-engine-prd-section-19/3-rules-engine-prd-section-19.patch`
- Patch SHA-256: `00186ec87dc047d7af540b80e7487121cce2ea39d65bc30bfd8fd34eda9f963a`
- Patch base: Phase 2 checkpoint tree (`7e394e9643ae736612c88fa3a49152ca463fc27e` + Phase 2 patch)
- Started: `2026-06-23`
- Finished: `2026-06-23`
- Implemented by: `Codex`
- Reviewed by: `Pasteur reviewer`
- Outcome: `COMPLETE`

## Outcome summary

Phase 3 replaces the pre-PRD purchase heuristics with the deterministic PRD §19 rules engine. The calculation layer is now split into the requested modules, the compatibility entry point remains available for existing callers, and live checker flows pass the PRD inputs needed by the engine.

Independent review found missing live inputs, a financed-purchase cash-flow regression, non-durable result fields, missing debt-pressure coverage, and a bad current-alternative inference. Those were repaired and verified. The final narrow reviewer process returned an empty payload after the last repair, so the report records the repaired findings and the post-repair verification instead of claiming an additional reviewer approval text.

## Original objective

> Implement the PRD Section 19 deterministic financial rules engine as pure TypeScript modules.

### In scope

- PRD §19.1 safe-to-spend.
- PRD §19.2 monthly free cash flow.
- PRD §19.3 emergency fund progress.
- PRD §19.4 additive purchase risk score and thresholds.
- PRD §19.5 cooldown tiers.
- PRD §19.6 health score.
- Snapshot compatibility wrappers used by the current app.
- Durable saved-check fields needed to preserve Phase 3 results after reload.

### Explicitly out of scope

- Full Phase 4 manual checker fields such as location, sale deadline, notes, and result UI expansion.
- Goal planner UI.
- Cooldown recheck/convert-to-goal UI.
- LiteRT advisor integration.

## Implementation design

### Chosen approach

Keep `src/lib/calculations/purchase-decision.ts` as the existing public import seam, but move raw formulas into focused modules:

- `cashflow.ts`
- `emergency-fund.ts`
- `debt-pressure.ts`
- `goal-impact.ts`
- `cooldown.ts`
- `health-score.ts`
- `purchase-decision.ts`

Snapshot wrappers derive current-schema inputs conservatively: recurring monthly expenses and debt minimums are treated as 30-day obligations, and emergency buffer is derived as `min(currentSavings, emergencyFundTarget * 0.2)` based on the PRD example.

### Review-driven repairs

- Manual checker now sends down payment, income-generating status, and explicit current-alternative status to the engine.
- Voice checker now sends reviewed down payment to the engine.
- Financing with zero or negative free cash flow now receives a deterministic guardrail and returns `NOT_RECOMMENDED`.
- Saved purchase checks now persist down payment, income-generating status, current-alternative status, risk score, savings-after-purchase, and cooldown days.
- Mapper now preserves stored cooldown days rather than recomputing them on reload.
- Debt-pressure zero-income branches have direct tests.

## Files changed

Core rules engine:

- `src/lib/calculations/cashflow.ts`
- `src/lib/calculations/emergency-fund.ts`
- `src/lib/calculations/debt-pressure.ts`
- `src/lib/calculations/goal-impact.ts`
- `src/lib/calculations/cooldown.ts`
- `src/lib/calculations/health-score.ts`
- `src/lib/calculations/purchase-decision.ts`
- matching tests under `src/lib/calculations/*.test.ts`

Integration seams:

- `src/types/finance.ts`
- `src/types/database.ts`
- `src/lib/schemas/finance.ts`
- `src/lib/schemas/finance.test.ts`
- `src/hooks/use-financial-state.ts`
- `src/features/purchase-checker/api/save-purchase-check.ts`
- `src/lib/supabase/finance-mappers.ts`
- related hook/mapper/action/component tests

Database:

- `supabase/migrations/20260623001000_purchase_check_prd19_results.sql`

## Database and migration changes

Added durable purchase-check columns:

- `down_payment`
- `is_income_generating`
- `current_alternative_still_works`
- `risk_score`
- `savings_after_purchase`
- `cooldown_days`

Constraints added:

- `purchase_checks_down_payment_nonnegative`
- `purchase_checks_risk_score_range`
- `purchase_checks_cooldown_days_nonnegative`

Verification:

```bash
supabase db reset
```

Result: `PASS`; all migrations applied through `20260623001000_purchase_check_prd19_results.sql`.

Direct schema check confirmed all six columns and three constraints.

## Verification results

| Check | Command | Result |
| --- | --- | --- |
| Focused reviewer-fix suite | `npm test -- src/features/purchase-checker/components/purchase-checker-wizard.test.tsx src/lib/calculations src/lib/schemas/finance.test.ts` | PASS, 9 files / 36 tests |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS with existing React Hook Form compiler warning |
| Regression suite | `npm test` | PASS, 34 files / 158 tests |
| Coverage | `npm run test:coverage` | PASS, statements 91.26%, branches 80.97%, functions 94.54%, lines 91.35% |
| Build | `npm run build` | PASS |
| Migration replay | `supabase db reset` | PASS |
| Diff check | `git diff --check` | PASS |
| Patch check | `shasum -a 256 3-rules-engine-prd-section-19.patch` | PASS |

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| PRD §19 formulas implemented | `npm test -- src/lib/calculations` and full suite | VERIFIED |
| Risk thresholds 75/50/30 covered | `purchase-decision.test.ts` | VERIFIED |
| Cooldown tiers covered | `cooldown.test.ts` | VERIFIED |
| Health score weights covered | `health-score.test.ts` | VERIFIED |
| Live manual/voice inputs reach engine | checker and voice component tests | VERIFIED |
| Saved results survive reload | save action + mapper tests | VERIFIED |
| Migration applies cleanly | `supabase db reset` | VERIFIED |

## Remaining risks

- Phase 4 still owns full result UI surfacing and additional manual checker fields such as location, sale deadline, and notes.
- Snapshot wrappers use current monthly recurring rows as the 30-day window until Phase 7 adds richer dated expense/debt management.
- The final reviewer re-check returned an empty payload after the last fix; all earlier review findings were repaired and the gates passed afterward.

## Next phase

`4 — Manual purchase checker completeness`.
