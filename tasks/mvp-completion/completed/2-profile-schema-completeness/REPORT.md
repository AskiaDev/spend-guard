# Milestone Report: 2 — Profile & schema completeness

## Report metadata

- Feature: `mvp-completion`
- Phase: `2`
- Goal: `tasks/mvp-completion/completed/2-profile-schema-completeness/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- Commit: `NOT COMMITTED` (checkpoint patch only — user commits)
- Checkpoint patch: `tasks/mvp-completion/completed/2-profile-schema-completeness/2-profile-schema-completeness.patch`
- Patch SHA-256: `871dedc9b9faba673f86f709c2c6618197e95ded78ece9ebd8d96b6b37bda94f`
- Base commit SHA: `7e394e9643ae736612c88fa3a49152ca463fc27e`
- Started: `2026-06-23`
- Finished: `2026-06-23`
- Implemented by: `Claude Code + Codex`
- Reviewed by: `Laplace reviewer + Kuhn reviewer`
- Outcome: `COMPLETE`

## Outcome summary

Phase 2 adds the PRD §22.1 profile fields end to end: schema, types, mapper, Supabase persistence, onboarding collection/review, and routing by `onboarding_completed`. The first independent review found two blocking sequencing/error-handling issues; both were fixed and covered by regression tests. The final review returned `SAFE TO CHECKPOINT`.

The migration itself applied locally and the resulting schema was confirmed by direct database queries. The only verification caveat is that `supabase db reset` applies all migrations but exits 1 during local container restart with `Error status 502`; this is recorded as an environment issue, not hidden as a pass.

## Original objective

> Add the four PRD §22.1 profile columns, collect pay frequency + estimated variable spending (and optional full name) in onboarding, persist them, mark `onboarding_completed` on save, and route users by onboarding state.

### In scope

- Additive profile migration with rollback comments and backfill.
- Profile schema, finance/database types, default data, mapper, and fixtures.
- Onboarding fields for full name, pay frequency, and estimated variable expenses.
- Save action persistence and delayed onboarding-completion flag.
- Proxy routing by authenticated user's onboarding status.

### Explicitly out of scope

- P3 rules-engine math using variable expenses or pay frequency.
- Dashboard display of variable expenses or name.
- Expenses/debts/settings management routes.

## Starting repository state

- Phase 1 verified the merged redesign + Supabase baseline.
- `profiles` lacked `full_name`, `pay_frequency`, `estimated_variable_expenses`, and `onboarding_completed`.
- Onboarding collected only currency, income, savings, expenses, debt, and goal toggles.
- Auth routing was pure and auth-only; it did not know onboarding state.

### Existing work preserved

- Existing deterministic calculations under `src/lib/calculations/**` were untouched.
- Existing server-action auth/RLS pattern remained server-derived via Supabase Auth.
- Existing onboarding six-step flow was preserved; new fields were added to the income step.

## Exploration findings

### Existing execution path

`/onboarding` renders `OnboardingPageContent` through the app shell and `FinancialStateProvider`. The wizard submits a `FinancialSnapshot` to `replaceFinancialSetup`, which calls `saveFinancialProfileAction({ profile, expenses, debts, goals })`, then reloads via `loadFinancialWorkspaceAction`.

### Existing architectural ownership

Profile validation lives in `src/lib/schemas/finance.ts`; row/client mapping lives in `finance-mappers`; auth redirect decisions live in `auth-routing`; route-level auth is in `src/proxy.ts`.

### Existing public contracts

`FinancialProfile` remains backward-compatible by keeping the new fields optional at the client type boundary. `saveFinancialProfileAction` still accepts the same top-level payload shape and derives `user_id` server-side.

### Existing test conventions

Focused Vitest tests cover pure routing, schema parsing, mappers, server actions, and React Testing Library onboarding flows. Browser smoke used Playwright against the local Supabase stack.

### Risks identified before implementation

- Marking onboarding complete too early could strand users after partial setup failures.
- Treating profile lookup errors as "not onboarded" could redirect existing users into setup.
- Supabase migration replay depends on local Docker/CLI health.

## Implementation design

### Chosen approach

Extend the existing seams rather than adding a parallel profile/onboarding service. The profile row stores the new fields, the mapper returns them as optional client fields, onboarding writes them through the existing save action, and `proxy.ts` reads only `onboarding_completed` for redirect decisions.

### Reused components

- `financialProfileSchema` — extended with `fullName`, `payFrequency`, and `estimatedVariableExpenses`.
- `saveFinancialProfileAction` — reused as the authenticated replacement boundary.
- `getAuthRedirect` — kept pure and extended with `onboardingCompleted`.
- `OnboardingSetup` — kept as the public UI path.

### New components

- `supabase/migrations/20260623000000_profile_completeness.sql` — profile columns, constraints, backfill, rollback comments.
- `src/proxy.test.ts` — direct coverage for the proxy onboarding-status lookup seam.
- `src/lib/schemas/finance.test.ts` — schema defaults and invalid-input coverage.

### Alternatives rejected

#### Put `onboarding_completed` inside `FinancialProfile`

- Reason rejected: it is routing/account state, not financial calculation input.
- Risk avoided: leaking auth workflow state into P3 rules-engine inputs.

#### Mark completion during the initial profile upsert

- Reason rejected: if expenses/debts/goals replacement failed later, users could be marked complete with partial setup.
- Risk avoided: stranded onboarding state and destructive retry path.

### Architectural invariants preserved

- No P3 rules-engine files changed.
- No RLS policy weakening; existing row policies cover the new profile columns.
- Server actions still derive `user_id` from Supabase Auth.
- LLM behavior untouched.

## Behavior implemented

### Profile completeness schema and persistence

`profiles` now supports `full_name`, `pay_frequency`, `estimated_variable_expenses`, and `onboarding_completed`. The save action persists the first three fields and only marks `onboarding_completed = true` after profile, expense, debt, and goal writes succeed.

Evidence:

- `save-financial-profile.test.ts`
- Local browser smoke + DB row query confirmed `full_name='Askia Final'`, `pay_frequency='weekly'`, `estimated_variable_expenses=16000`, `onboarding_completed=true`.

### Onboarding collection and review

The income step now collects full name, pay frequency, monthly income, and estimated variable expenses. Values survive Back/Continue, appear on Review, and are included in the submitted `FinancialSnapshot`.

Evidence:

- `onboarding-setup.test.tsx`
- Local Playwright smoke against `/onboarding`

### Onboarding-aware routing

`getAuthRedirect(pathname, isAuthenticated, onboardingCompleted)` routes authenticated-but-not-onboarded users to `/onboarding`, while allowing `/onboarding` and `/auth/*` to avoid loops. `proxy.ts` reads `profiles.onboarding_completed` for authenticated users. Missing row means not onboarded; lookup error fails open for authenticated users.

Evidence:

- `auth-routing.test.ts`
- `proxy.test.ts`
- `npm run build`

### Error and edge-case behavior

- Invalid pay frequency and negative variable expenses reject in Zod.
- Missing profile row routes an authenticated user to onboarding.
- Profile lookup error logs and treats the user as onboarded to avoid destructive forced setup.
- Insert failure after profile upsert does not mark onboarding complete.
- Completion update failure returns a safe error.

## Files changed

| File | Change | Purpose |
| --- | --- | --- |
| `supabase/migrations/20260623000000_profile_completeness.sql` | new | Add profile completeness columns, constraints, backfill, rollback comments |
| `src/types/finance.ts` | modified | Add pay-frequency constants/labels and optional profile fields |
| `src/types/database.ts` | modified | Add profile DB fields |
| `src/lib/schemas/finance.ts` | modified | Validate/default profile completeness fields |
| `src/lib/schemas/finance.test.ts` | new | Schema default and invalid-input tests |
| `src/lib/storage/default-data.ts` | modified | Empty profile defaults |
| `src/lib/supabase/finance-mappers.ts` | modified | Map new profile fields |
| `src/lib/supabase/finance-mappers.test.ts` | modified | Mapper new-field and fallback coverage |
| `src/features/financial-profile/api/save-financial-profile.ts` | modified | Persist fields and mark completion after setup writes |
| `src/features/financial-profile/api/save-financial-profile.test.ts` | modified | Persistence and failure-order regression tests |
| `src/features/onboarding/components/onboarding-setup.tsx` | modified | Collect/review/submit new fields |
| `src/features/onboarding/components/onboarding-setup.test.tsx` | modified | UI/payload coverage |
| `src/features/auth/api/auth-routing.ts` | modified | Onboarding-aware redirect matrix |
| `src/features/auth/api/auth-routing.test.ts` | modified | Redirect coverage |
| `src/proxy.ts` | modified | Read onboarding completion status |
| `src/proxy.test.ts` | new | Profile lookup seam coverage |
| `src/test/fixtures/financial-snapshot.ts` | modified | Fixture profile values |
| `tasks/mvp-completion/ROADMAP.md` | modified | Mark P1/P2 complete |

### Files intentionally not changed

- `src/lib/calculations/**` — P3 owns rules-engine use of variable expenses/pay frequency.
- Dashboard components — P8 owns display of variable-expense cards/greetings.
- RLS policy migration — existing `profiles_*_own` policies cover new columns.

### Scope exceptions

| File | Why it became necessary | Human approval |
| --- | --- | --- |
| `src/proxy.test.ts` | Required by independent review to cover the new proxy DB lookup seam directly | not separately requested; phase-local test |
| `src/lib/schemas/finance.test.ts` | Required by goal's Zod validation test requirement | not separately requested; phase-local test |

## Database and migration changes

### Migrations added

- `supabase/migrations/20260623000000_profile_completeness.sql`

### Apply verification

```bash
supabase start
```

Result: `PASS`; migration `20260623000000_profile_completeness.sql` applied during local stack startup.

```bash
supabase db reset
```

Result: `BLOCKED`; on two attempts the CLI applied all migrations including P2, then exited 1 while restarting containers with `Error status 502`.

Direct schema verification after the reset attempts:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name in ('full_name','pay_frequency','estimated_variable_expenses','onboarding_completed') order by column_name;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "select conname from pg_constraint where conrelid = 'public.profiles'::regclass and conname in ('profiles_full_name_length','profiles_pay_frequency_check','profiles_estimated_variable_expenses_check') order by conname;"
```

Result: `PASS`; four columns and three constraints were present.

### Rollback verification

Rollback SQL is documented in the migration comments. It was inspected but not executed because applying it would remove the verified Phase 2 schema from the local stack.

### Data-safety evidence

- New columns are additive.
- Existing rows are backfilled to `onboarding_completed = true`.
- New check constraints reject invalid pay frequency, overlong full names, and negative variable expenses.
- No production data touched.

## Tests added or changed

| Test | Coverage |
| --- | --- |
| `src/features/auth/api/auth-routing.test.ts` | Authenticated/not-onboarded/onboarded/auth-callback redirect matrix |
| `src/proxy.test.ts` | Persisted true, missing row false, lookup error fail-open |
| `src/lib/schemas/finance.test.ts` | Profile defaults and invalid pay frequency / variable expenses |
| `src/lib/supabase/finance-mappers.test.ts` | New fields and fallback behavior |
| `src/features/financial-profile/api/save-financial-profile.test.ts` | Upsert payload, delayed completion flag, failure ordering |
| `src/features/onboarding/components/onboarding-setup.test.tsx` | New fields, Back preservation, Review display, submitted payload |

### Coverage boundaries

- Full hosted Supabase e2e remains credential-gated and belongs to P12.
- `supabase db reset` clean exit is blocked by local restart 502, though migration application/schema was verified.

## Verification results

### Focused checks

| Check | Command | Result |
| --- | --- | --- |
| Phase 2 focused suite | `npm test -- src/proxy.test.ts src/features/financial-profile/api/save-financial-profile.test.ts src/features/auth/api/auth-routing.test.ts src/lib/schemas/finance.test.ts src/lib/supabase/finance-mappers.test.ts src/features/onboarding/components/onboarding-setup.test.tsx` | PASS (6 files, 29 tests) |

### Public-path or integration checks

| Check | Command | Result |
| --- | --- | --- |
| Onboarding RTL public path | included in focused suite | PASS |
| Local browser onboarding flow | Playwright Chromium via Node script against local Supabase | PASS |
| Local DB persisted fields | `psql` row query for fresh smoke user | PASS |

### Regression checks

| Check | Command | Result |
| --- | --- | --- |
| Full suite | `npm test` | PASS (28 files, 143 tests) |
| Lint | `npm run lint` | PASS (1 existing warning in `purchase-checker-wizard.tsx`) |
| Typecheck | `npm run typecheck` | PASS |
| Coverage | `npm run test:coverage` | PASS (90.7 / 80.46 / 94.24 / 90.8) |
| Build | `npm run build` | PASS |

### Diff and scope checks

| Check | Command | Result |
| --- | --- | --- |
| Diff formatting | `git diff --check` | PASS |
| Changed files | `git diff --name-only` + untracked inspection | PASS |
| Working-tree status | `git status --short` | PASS with expected phase files plus existing `supabase/.temp/` artifact |
| Forbidden files untouched | inspection | PASS |

### Unrelated or environment-blocked checks

| Check | Reason | Impact |
| --- | --- | --- |
| Clean `supabase db reset` exit | Local Supabase CLI/container restart returns `Error status 502` after migrations apply | Migration replay command not clean; mitigated by startup apply and direct schema queries |
| Hosted Playwright e2e | No `E2E_SUPABASE_EMAIL` / `E2E_SUPABASE_PASSWORD` | Deferred to P12; local browser smoke covered P2 public path |

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Migration additive + rollback + backfill | migration SQL, `supabase start`, `supabase db reset` apply logs, direct schema queries | VERIFIED |
| Onboarding collects new fields | RTL test + local browser smoke | VERIFIED |
| Save sets onboarding completion after setup writes | save-action tests + local DB smoke row | VERIFIED |
| Mapper carries new fields | mapper tests | VERIFIED |
| Onboarding routing gate | auth-routing tests + proxy tests + build | VERIFIED |
| Existing behavior unchanged | full suite, typecheck, lint, build, coverage | VERIFIED |
| Public path works | local browser smoke | VERIFIED |
| No forbidden files changed | diff inspection | VERIFIED |
| Diff is structurally valid | `git diff --check` | VERIFIED |

## Acceptance-criteria results

- [x] **Migration adds 4 columns additively, backfills existing rows, and documents rollback** — implemented in `20260623000000_profile_completeness.sql`; applied locally; schema confirmed.
- [x] **Onboarding collects pay frequency, estimated variable expenses, and optional full name** — implemented and tested in RTL/browser.
- [x] **`saveFinancialProfileAction` persists new fields and sets `onboarding_completed=true`** — implemented with delayed completion update and regression tests.
- [x] **Mapper maps new columns with safe defaults** — implemented and tested.
- [x] **Auth routing honors onboarding state** — pure routing and proxy lookup tested.
- [x] **Existing onboarding payload behavior remains additive** — existing assertions still pass; full suite green.

## Independent review

### Correctness review

- Reviewer: `Laplace reviewer`
- Verdict: `SAFE AFTER REQUIRED FIXES`

Findings:

- `BLOCKING` Completion flag was set before dependent setup writes — Resolution: moved completion to final update after deletes/inserts succeed.
- `BLOCKING` Proxy lookup error forced users into onboarding — Resolution: missing row remains not onboarded; lookup error now fails open for authenticated users.
- `IMPORTANT` Missing direct proxy seam test — Resolution: added `src/proxy.test.ts`.
- `IMPORTANT` Missing failure-order regression — Resolution: save-action tests assert insert failure does not mark completion.

### Regression review

- Reviewer: `Kuhn reviewer`
- Verdict: `PASS`

Findings:

- No blocking or important findings remain.
- `MINOR` `supabase/.temp/cli-latest` exists locally — Resolution: excluded from checkpoint patch/archive.

### Simplification review

- Reviewer: `Codex`
- Verdict: `PASS WITH FINDINGS`

Findings:

- `SUGGESTION` Per-request profile lookup in proxy can be optimized later with cookie/JWT state. Kept for P2 correctness and simplicity.

## Repair history

### Review repair: completion flag sequencing

- Failing review: completion flag could persist before later setup writes failed.
- Repair: removed `onboarding_completed` from initial upsert; added final `profiles.update({ onboarding_completed: true }).eq("user_id", userId)` after all deletes/inserts succeed.
- Verification: focused suite, full suite, browser smoke, DB row query.

### Review repair: proxy lookup error behavior

- Failing review: lookup errors were treated as not onboarded.
- Repair: extracted `readOnboardingCompleted`; missing row returns false; lookup error logs and returns true.
- Verification: `src/proxy.test.ts`, build, typecheck.

## Deviations from the original goal

- `supabase db reset` did not exit cleanly due to local restart 502. The migration still applied, and direct schema queries confirmed the intended database state.

## Remaining risks and limitations

- Clean migration replay should be rerun after the local Supabase CLI/container restart issue is resolved.
- Proxy performs one profile-status read for authenticated requests; optimize later if latency becomes measurable.
- Hosted e2e remains credential-gated until P12.

## Follow-up work

- P3 may now consume `payFrequency` and `estimatedVariableExpenses` in the deterministic rules engine.
- P8 may later display variable expenses and name in dashboard UI.

## Guidance for the next milestone

The next milestone may rely on:

- `FinancialProfile.payFrequency`
- `FinancialProfile.estimatedVariableExpenses`
- `profiles.onboarding_completed`
- Onboarding-completed users being routed away from `/onboarding`

The next milestone must not assume:

- Rules-engine formulas already use variable expenses or pay frequency.
- Dashboard cards already display variable expenses.

### Recommended next milestone

`3 — Rules engine → PRD §19 deterministic model` — P2 now supplies the missing profile inputs required by the PRD cash-flow model.

## Human review checklist

- [ ] Review the complete diff or apply the checkpoint patch.
- [ ] Confirm changed-file scope.
- [ ] Inspect auth/proxy behavior and server-action sequencing.
- [ ] Inspect migration and rollback comments.
- [ ] Confirm tests were actually executed.
- [ ] Confirm the `supabase db reset` 502 caveat is acceptable.
- [ ] Confirm no P3 rules-engine work was started.

## Git and deployment status

- Commit created by agent: `NO`
- Pushed by agent: `NO`
- Merged by agent: `NO`
- Deployed by agent: `NO`
- Production data modified: `NO`

## Final disposition

- Agent recommendation: `READY FOR HUMAN REVIEW`
- Human decision: `PENDING`
- Human reviewer: `pending`
- Decision date: `pending`
