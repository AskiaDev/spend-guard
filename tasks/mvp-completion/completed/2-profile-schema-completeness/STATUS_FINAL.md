# Milestone Status: 2 — Profile & schema completeness

## Metadata

- Feature: `mvp-completion`
- Phase: `2`
- Goal: `tasks/mvp-completion/CURRENT_GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- State: `READY FOR HUMAN REVIEW`
- Last updated: `2026-06-23 19:57`
- Updated by: `Codex`

## Current objective

Add the 4 PRD §22.1 profile columns, collect pay frequency + variable spending (+ optional name) in onboarding, persist them, set `onboarding_completed`, and route by onboarding state.

## Current step

Implementation, verification, independent review, and checkpoint patch are complete. Phase report/archive are in progress.

## Completed prior phases

- Phase 1 — Integration baseline (verified, archived).

## Investigation findings

- `replaceFinancialSetup` (`use-financial-state.ts:78`) → `saveFinancialProfileAction({profile,expenses,debts,goals})`; wizard `buildSnapshotPayload` produces the snapshot.
- Onboarding test uses `toMatchObject`/`arrayContaining` (partial) → additive profile fields won't break it.
- `getAuthRedirect` pure, used only in `proxy.ts`; safe to extend with a 3rd arg.
- Profile constructed in: types, fixture, default-data, mapper, wizard, + tests (save-financial-profile, use-financial-state, purchase-decision). New fields kept OPTIONAL to avoid editing P3-owned `purchase-decision.test.ts`.
- RLS on profiles is row-level (`profiles_{select,insert,update,delete}_own`) → new columns covered, no policy change.
- Read Next 16 proxy docs under `node_modules/next/dist/docs/01-app/...` before editing `src/proxy.ts`; Proxy can be async and redirect, but auth still belongs in server actions.
- Invoked `frontend-design` before onboarding UI edits; kept the existing wizard layout and added fields within the income step rather than redesigning the flow.
- Local Supabase stack can apply the migration, but `supabase db reset` exits 1 during local container restart with a 502 after applying migrations.

## Completed in this milestone

- Auth routing gate extended and tested for onboarding-completed routing.
- `financialProfileSchema` extended with `fullName`, `payFrequency`, and `estimatedVariableExpenses` defaults/validation plus focused tests.
- `FinancialProfile`, generated DB types, `emptySnapshot`, fixture, and mapper carry the new profile fields.
- `saveFinancialProfileAction` persists the new fields and sets `onboarding_completed = true`.
- Onboarding wizard collects full name, pay frequency, and estimated variable expenses; values survive Back; review displays them; payload includes them.
- `proxy.ts` reads `profiles.onboarding_completed` for authenticated users and passes it into `getAuthRedirect`.
- Additive profile-completeness migration added with rollback comments and constraints.
- Local browser smoke exercised login → onboarding fields → Back preservation → Review → Finish Setup → dashboard against local Supabase.

## In progress

- Report/archive finalization.

## Remaining work

- [x] `getAuthRedirect` + test (onboarding gate)
- [x] Zod `financialProfileSchema` new fields + test
- [x] `finance-mappers` new fields + test
- [x] `saveFinancialProfileAction` new cols + `onboarding_completed` + test
- [x] Type plumbing: `FinancialProfile`, `database.ts`, `default-data`, fixture
- [x] Wizard UI (frontend-design first) + test
- [x] `proxy.ts` supplies `onboardingCompleted`
- [x] Migration SQL + rollback + local schema verification
- [x] Regression + lint + coverage + build
- [x] Independent review
- [x] Checkpoint patch
- [ ] Report and archive
- [ ] Human diff review

## Files changed

| File | Status | Purpose |
| --- | --- | --- |
| `src/features/auth/api/auth-routing.ts` | modified | Adds onboarding-completed routing state. |
| `src/features/auth/api/auth-routing.test.ts` | modified | Covers unauth, not-onboarded, onboarded, and auth callback routing. |
| `src/lib/schemas/finance.ts` | modified | Adds profile completeness validation/defaults. |
| `src/lib/schemas/finance.test.ts` | new | Covers profile defaults and invalid pay frequency/variable expenses. |
| `src/types/finance.ts` | modified | Adds `PayFrequency` and optional profile fields. |
| `src/types/database.ts` | modified | Adds profile row/insert/update fields. |
| `src/lib/storage/default-data.ts` | modified | Adds safe empty profile defaults. |
| `src/lib/supabase/finance-mappers.ts` | modified | Maps new DB profile fields into `FinancialProfile`. |
| `src/lib/supabase/finance-mappers.test.ts` | modified | Covers explicit new fields and mapper fallbacks. |
| `src/features/financial-profile/api/save-financial-profile.ts` | modified | Persists new profile fields and `onboarding_completed`. |
| `src/features/financial-profile/api/save-financial-profile.test.ts` | modified | Asserts upsert payload includes new fields and completion flag. |
| `src/features/onboarding/components/onboarding-setup.tsx` | modified | Adds form controls, defaults, review rows, and payload fields. |
| `src/features/onboarding/components/onboarding-setup.test.tsx` | modified | Covers Back preservation, review values, and submitted payload. |
| `src/proxy.ts` | modified | Reads onboarding status for authenticated routing. |
| `src/test/fixtures/financial-snapshot.ts` | modified | Adds new profile fixture values. |
| `supabase/migrations/20260623000000_profile_completeness.sql` | new | Adds profile completeness columns, constraints, backfill, rollback note. |
| `tasks/mvp-completion/ROADMAP.md` | modified | Marks Phase 1 complete. |
| `tasks/mvp-completion/completed/2-profile-schema-completeness/2-profile-schema-completeness.patch` | new | Phase checkpoint patch. |

## Decisions made

### New profile fields are OPTIONAL on `FinancialProfile`
- Decision: `fullName?`, `payFrequency?`, `estimatedVariableExpenses?` optional in the client type.
- Reason: DB columns are NOT NULL with defaults; the client type stays loose so P2 needn't edit P3-owned engine tests. Real data paths (mapper, defaults, fixture, wizard) populate them.
- Alternatives rejected: required fields — forces churn on `purchase-decision.test.ts` (P3 territory).
- Impact: P3 may tighten to required when building the §19 engine.

### `onboarding_completed` is server-side routing state
- Decision: not part of `FinancialProfile`; read directly in `proxy.ts`.
- Reason: keeps the financial snapshot pure; avoids leaking routing state into calculations.

## Verification status

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | PASS | exit 0 |
| Lint | `npm run lint` | PASS | exit 0; one pre-existing React Hook Form compiler warning in `purchase-checker-wizard.tsx` |
| Focused tests | `npm test -- src/proxy.test.ts src/features/financial-profile/api/save-financial-profile.test.ts src/features/auth/api/auth-routing.test.ts src/lib/schemas/finance.test.ts src/lib/supabase/finance-mappers.test.ts src/features/onboarding/components/onboarding-setup.test.tsx` | PASS | 6 files, 29 tests |
| Public-path (wizard RTL) | same focused command | PASS | onboarding render/interactions/submission covered |
| Public-path (browser) | local Playwright smoke via Node/Chromium | PASS | fresh local account after review fixes: login → `/onboarding` → fields/back/review/finish → dashboard; DB row confirmed |
| Regression | `npm test` | PASS | 28 files, 143 tests |
| Coverage (≥80%) | `npm run test:coverage` | PASS | 90.7 / 80.46 / 94.24 / 90.8 |
| Build | `npm run build` | PASS | route/proxy build green |
| Migration startup apply | `supabase start` | PASS | applied `20260623000000_profile_completeness.sql` |
| Migration replay | `supabase db reset` | BLOCKED | migrations apply, then local CLI exits 1 during container restart with `Error status 502` on two attempts |
| Local schema check | `psql ... information_schema.columns` + `pg_constraint` | PASS | 4 columns + 3 constraints present after reset attempts |
| Diff check | `git diff --check` | PASS | clean |

## Claim-to-evidence progress

| Completion claim | Status | Evidence |
| --- | --- | --- |
| Migration additive + rollback + backfill | VERIFIED | SQL added with rollback comments; `supabase start` applied it; `supabase db reset` applied it before local restart 502; direct local schema confirmed 4 columns + 3 constraints |
| Onboarding collects new fields | VERIFIED | focused RTL test + local Playwright browser smoke |
| Save sets onboarding_completed + cols | VERIFIED | `save-financial-profile.test.ts` + local DB row after browser smoke |
| Mapper carries new fields | VERIFIED | `finance-mappers.test.ts` |
| Onboarding routing gate | VERIFIED | `auth-routing.test.ts`; `proxy.ts` type/build verified |
| Existing behavior unchanged | VERIFIED | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:coverage` |

## Review findings

### Correctness review
- State: `PASS`
- Findings:
    - First review: `SAFE AFTER REQUIRED FIXES`; fixed early completion flag and proxy lookup-error behavior.
    - Second review: `SAFE TO CHECKPOINT`; no blocking or important findings remain.

### Regression review
- State: `PASS`
- Findings:
    - Full tests, typecheck, lint, coverage, build, and browser smoke rerun after review repairs.

### Simplification review
- State: `PASS WITH FINDINGS`
- Findings:
    - `MINOR` `supabase/.temp/cli-latest` is a local CLI artifact; excluded from checkpoint.
    - `SUGGESTION` per-request proxy profile lookup may later be optimized with a cookie/JWT claim.

## Repair attempts

None yet.

## Blockers and open questions

### Migration apply verification
- Type: `ENVIRONMENT`
- Impact: `supabase db reset` applies migrations but exits 1 during local container restart, so the replay command is not clean.
- Evidence: two reset attempts both applied `20260623000000_profile_completeness.sql` then failed with `Error status 502`; direct `psql` schema checks confirmed the expected columns/constraints after the failure.
- Decision required: accept direct local schema verification plus startup apply as sufficient for P2, or rerun reset after local Supabase CLI/container issue is fixed.

## Remaining risks

- `supabase db reset` command remains environment-blocked by local restart 502 despite SQL applying.
- Per-request profile read in middleware adds latency (perf follow-up: cache via cookie/JWT claim).

## Next action

Finalize `REPORT_DRAFT.md`, archive Phase 2 under `completed/2-profile-schema-completeness/`, then advance to Phase 3.

## Scope confirmation

- [x] No next-phase work started
- [x] No forbidden files modified
- [x] No unrelated refactor introduced
- [x] No tests weakened or removed
- [x] No RLS / validation bypassed
- [x] No commit, push, merge, rebase, or deployment performed

## Human review readiness

- State: `READY WITH KNOWN RISKS`

## Session handoff

Resume from Next action; TDD order in Remaining work.
