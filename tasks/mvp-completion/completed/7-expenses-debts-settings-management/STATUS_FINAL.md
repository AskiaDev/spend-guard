# Milestone Status: 7 — Expenses / Debts / Settings Management

## Metadata

- Feature: `SpendGuard MVP completion`
- Phase: `7`
- Goal: `tasks/mvp-completion/CURRENT_GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- State: `READY FOR HUMAN REVIEW`
- Last updated: `2026-06-24 02:50 PST`
- Updated by: `Codex`

## Current objective

Add edit-later management for expenses, debts, and settings through authenticated Supabase-backed actions and routed app pages.

## Current step

Phase 7 is implemented, verified, reviewed, archived, and ready for a scoped human checkpoint commit.

## Completed prior phases

- Phase 1 — Integration baseline
- Phase 2 — Profile and schema completeness
- Phase 3 — PRD Section 19 deterministic rules engine
- Phase 4 — Manual purchase checker completeness
- Phase 5 — Goal planner completion
- Phase 6 — Cooldown completion

Do not list partially implemented work.

## Investigation findings

- `saveFinancialProfileAction` currently replaces onboarding setup rows in bulk and marks onboarding complete.
- `createGoalAction` and `deleteGoalAction` are the closest narrow CRUD pattern: validate with Zod, derive `user_id` from `requireUserId`, write to Supabase, return `ActionResult`.
- `loadFinancialWorkspaceAction` already loads expenses and debts ordered by `due_day`, then maps them into `snapshot.expenses` and `snapshot.debts`.
- `useFinancialState` owns all current app mutations and refreshes the Supabase workspace after successful writes.
- `AppDesktopNavigation` still links Debts to `/goals#debts` and Settings to `/onboarding`; no real `/expenses`, `/debts`, or `/settings` routes exist.
- `page-adapters.tsx` is the route-to-feature bridge for app pages and should expose the new panels through `FinancialStateProvider`.
- Existing unrelated dirty files are present and excluded from Phase 7 unless they become necessary: `CLAUDE.md`, `package.json`, `.agents/`, `.claude/`, `.codex/`, `supabase/.branches/`, `supabase/.temp/`.

## Completed in this milestone

- Created Phase 7 `CURRENT_GOAL.md`.
- Created Phase 7 `STATUS.md`.
- Added authenticated expense create/update/delete actions and action tests.
- Added authenticated debt create/update/delete actions and action tests.
- Added settings profile update and delete-financial-data actions and action tests.
- Wired expense, debt, and settings mutations through `useFinancialState`.
- Added `/expenses`, `/debts`, and `/settings` routes and page-adapter wiring.
- Added Expenses, Debts, and Settings panels with form validation and component tests.
- Updated app navigation from placeholder Debts/Settings links to real routes and added Expenses.
- Updated auth-routing and app-shell tests for the new protected routes/links.
- Verified `/expenses`, `/debts`, and `/settings` with targeted Playwright smoke using hosted beta Supabase login; no data was mutated.

## In progress

- None.

## Remaining work

- [x] Add authenticated expense server actions and tests.
- [x] Add authenticated debt server actions and tests.
- [x] Add settings profile/delete-data server actions and tests.
- [x] Wire `useFinancialState` callbacks and tests.
- [x] Add Expenses, Debts, and Settings panels with component tests.
- [x] Add `/expenses`, `/debts`, `/settings` routes and page-adapter tests.
- [x] Update navigation to real routes and verify route expectations.
- [x] Run focused tests, public-path checks, regression suite, typecheck, lint, coverage, build, diff checks.
- [x] Perform independent no-edit review.
- [x] Archive Phase 7 and prepare checkpoint.

## Files changed

| File | Status | Purpose |
| --- | --- | --- |
| `tasks/mvp-completion/CURRENT_GOAL.md` | new | Bounded Phase 7 goal and verification matrix |
| `tasks/mvp-completion/STATUS.md` | new | Phase 7 progress and evidence tracker |
| `src/features/expenses/api/manage-expense.ts` | new | Authenticated expense CRUD actions |
| `src/features/expenses/api/manage-expense.test.ts` | new | Expense action validation/auth/RLS-scope tests |
| `src/features/expenses/components/expenses-panel.tsx` | new | Expense management UI |
| `src/features/expenses/components/expenses-panel.test.tsx` | new | Expense panel public-path interaction tests |
| `src/features/expenses/index.ts` | new | Feature export |
| `src/features/debts/api/manage-debt.ts` | new | Authenticated debt CRUD actions |
| `src/features/debts/api/manage-debt.test.ts` | new | Debt action validation/auth/RLS-scope tests |
| `src/features/debts/components/debts-panel.tsx` | new | Debt management UI |
| `src/features/debts/components/debts-panel.test.tsx` | new | Debt panel public-path interaction tests |
| `src/features/debts/index.ts` | new | Feature export |
| `src/features/settings/api/manage-settings.ts` | new | Settings profile update and delete-financial-data actions |
| `src/features/settings/api/manage-settings.test.ts` | new | Settings action validation/delete-data tests |
| `src/features/settings/components/settings-panel.tsx` | new | Settings and data deletion UI |
| `src/features/settings/components/settings-panel.test.tsx` | new | Settings panel interaction tests |
| `src/features/settings/index.ts` | new | Feature export |
| `src/app/(app)/expenses/page.tsx` | new | Expenses route |
| `src/app/(app)/debts/page.tsx` | new | Debts route |
| `src/app/(app)/settings/page.tsx` | new | Settings route |
| `src/app/(app)/_components/page-adapters.tsx` | modified | Route adapter wiring for new panels |
| `src/app/(app)/_components/page-adapters.test.tsx` | modified | Adapter prop/callback coverage |
| `src/hooks/use-financial-state.ts` | modified | Central mutation callbacks for Phase 7 |
| `src/hooks/use-financial-state.test.tsx` | modified | Hook action/refresh/failure coverage |
| `src/components/layout/app-navigation.tsx` | modified | Real Expenses/Debts/Settings links |
| `src/components/layout/app-shell.test.tsx` | modified | Navigation link regression coverage |
| `src/features/auth/api/auth-routing.test.ts` | modified | Protected-route expectation coverage |

## Decisions made

### Delete financial data boundary

- Decision: Phase 7 delete-my-data removes app financial rows for the current authenticated user, not the Supabase Auth account.
- Reason: This satisfies the roadmap's settings control while staying inside current user-scoped RLS/server-action capability and avoiding service-role account deletion.
- Alternatives rejected:
  - Delete Auth user account: requires admin/service-role behavior outside the existing app action boundary.
  - Leave delete-my-data for Phase 11: conflicts with the explicit Phase 7 settings scope.
- Impact on future phases: Phase 11 can still add transcript-specific privacy copy and broader privacy surface without changing this Phase 7 data-deletion seam.

## Verification status

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | PASS | `tsc --noEmit` passed |
| Lint | `npm run lint` | PASS | 0 errors / 271 warnings from unrelated local skill bundles and existing React Hook Form compiler warning |
| Focused test | `npm test -- src/features/expenses src/features/debts src/features/settings src/hooks/use-financial-state.test.tsx "src/app/(app)/_components/page-adapters.test.tsx" src/components/layout/app-shell.test.tsx src/features/auth/api/auth-routing.test.ts` | PASS | 10 files / 59 tests |
| Hook test | included in focused test | PASS | `use-financial-state.test.tsx` covered new actions and failures |
| Public-path test | focused component/adapter tests + targeted Playwright smoke | PASS | `/expenses`, `/debts`, `/settings` rendered, screenshot buffers captured, form/delete-guard interactions passed |
| Regression suite | `npm test` | PASS | 43 files / 225 tests |
| Coverage (>=80%) | `npm run test:coverage` | PASS | 91.32% statements / 81.94% branches / 94.94% functions / 91.32% lines |
| Build | `npm run build` | PASS | Next build lists `/expenses`, `/debts`, `/settings` dynamic routes |
| Migration replay | `supabase db reset` | NOT APPLICABLE | no migration expected |
| Security audit | `npm audit --audit-level=high` | PASS | found 0 vulnerabilities |
| Diff check | `git diff --check` | PASS | no whitespace errors for tracked diffs; staged Phase 7 diff check still pending at checkpoint |
| Scope check | `git diff --name-only` + `git status --short` | PASS | Phase 7 files identified; unrelated dirty files remain excluded |

Result values: `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, `NOT APPLICABLE`.

## Claim-to-evidence progress

| Completion claim | Status | Evidence |
| --- | --- | --- |
| `/expenses` supports create, edit, and delete through authenticated actions | VERIFIED | expense action tests, panel tests, hook tests, Playwright smoke |
| `/debts` supports create, edit, and delete through authenticated actions | VERIFIED | debt action tests, panel tests, hook tests, Playwright smoke |
| `/settings` supports profile edits | VERIFIED | settings action tests, panel tests, hook tests, Playwright smoke |
| Delete-financial-data removes app rows for current user only | VERIFIED | settings action tests assert all deletes scoped by `user_id`; panel smoke only checked confirmation guard and did not mutate beta data |
| Debt due dates remain in `snapshot.debts` for deterministic calculations | VERIFIED | adapter/hook/panel path uses `state.snapshot.debts`; existing mapper tests preserved |
| Existing P1-P6 behavior unchanged | VERIFIED | full `npm test`, typecheck, coverage, build |
| Public entry point works | VERIFIED | route adapter tests plus targeted Playwright smoke for `/expenses`, `/debts`, `/settings` |
| No forbidden files changed | VERIFIED | scope review; no calculation/dashboard/report/AI files touched |

## Review findings

### Correctness review

- State: `PASS`
- Findings:
  - None.

### Regression review

- State: `PASS`
- Findings:
  - None.

### Simplification review

- State: `PASS`
- Findings:
  - None.

## Repair attempts

None.

## Blockers and open questions

None.

## Remaining risks

- Broad `e2e/spendguard.spec.ts` has known stale/non-isolated failures from Phase 6 and was not used as the clean Phase 7 public-path gate.
- Delete-financial-data keeps the login account by design; future privacy work may add Auth account deletion if the product requires it.
- Hosted beta data may be messy per user instruction; Phase 7 must tolerate real rows and avoid assumptions that only seed data exists.
- `CLAUDE.md`, `package.json`, `.agents/`, `.claude/`, `.codex/`, and Supabase temp directories remain unrelated local dirt and must stay out of the Phase 7 checkpoint.

## Next action

Review and commit only the scoped Phase 7 files; keep unrelated local dirty files out of the checkpoint.

## Scope confirmation

- [x] No next-phase work started
- [x] No forbidden files modified
- [x] No unrelated refactor introduced
- [x] No tests weakened or removed
- [x] No RLS / validation bypassed
- [x] No new commit, push, merge, rebase, or deployment performed for Phase 7 yet

## Human review readiness

- State: `READY WITH KNOWN RISKS`

## Session handoff

For the next session: (1) read `CURRENT_GOAL.md`; (2) read this `STATUS.md`; (3) inspect the current Git diff; (4) preserve completed work; (5) resume from `Next action`; (6) do not repeat completed work; (7) do not begin the next milestone.
