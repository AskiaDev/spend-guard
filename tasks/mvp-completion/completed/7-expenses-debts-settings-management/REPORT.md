# Milestone Report: 7 — Expenses / Debts / Settings Management

## Report metadata

- Feature: `SpendGuard MVP completion`
- Phase: `7`
- Goal: `tasks/mvp-completion/completed/7-expenses-debts-settings-management/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- Commit: `NOT COMMITTED`
- Checkpoint patch: `tasks/mvp-completion/completed/7-expenses-debts-settings-management/7-expenses-debts-settings-management.patch`
- Patch SHA-256: `57d85f33142760e550956c3f0787d797c1aa2dde4586adb676ddc16be5a9e5fb`
- Base commit SHA: `edaa96b`
- Started: `2026-06-24`
- Finished: `2026-06-24`
- Implemented by: `Codex`
- Reviewed by: `Codex no-edit review`
- Outcome: `COMPLETE`

## Outcome summary

Phase 7 added edit-later management for expenses, debts, and settings. Users now have routed `/expenses`, `/debts`, and `/settings` pages wired through authenticated Supabase server actions and the existing `useFinancialState` refresh path. Verification passed focused tests, full regression, coverage, lint, typecheck, build, security audit, and a targeted browser smoke against hosted beta Supabase without mutating beta data.

## Original objective

> Implement edit-later management for expenses, debts, and account settings so onboarded users can manage the financial values that currently exist only in onboarding.

### In scope

- Expense create, update, and delete server actions plus `/expenses`.
- Debt create, update, and delete server actions plus `/debts`.
- Settings profile edit and delete-financial-data control plus `/settings`.
- Hook, page-adapter, navigation, and protected-route test updates.

### Explicitly out of scope

- Dashboard completeness from Phase 8.
- Weekly report generation from Phase 9.
- LiteRT advisor integration from Phase 10.
- Broader privacy/disclaimer/transcript work from Phase 11.
- Broad E2E suite hardening from Phase 12.
- Supabase Auth account deletion.

## Starting repository state

Before this milestone:

- Expenses and debts were loaded from Supabase and used in deterministic calculations.
- Expenses/debts were only editable during onboarding through `saveFinancialProfileAction`.
- App navigation pointed Debts to `/goals#debts` and Settings to `/onboarding`.
- No `/expenses`, `/debts`, or `/settings` app routes existed.

### Existing work preserved

- P1-P6 behavior was not redesigned.
- No files under `src/lib/calculations/**`, dashboard, reports, or advisor flows were changed.
- Existing Supabase RLS policies and authenticated `requireUserId` action boundary were reused.

## Exploration findings

### Existing execution path

`loadFinancialWorkspaceAction` loads `expenses` and `debts` ordered by `due_day`, then `mapFinancialWorkspaceRows` exposes them as `snapshot.expenses` and `snapshot.debts`. Routed pages consume data through `FinancialStateProvider` and `page-adapters.tsx`.

### Existing architectural ownership

`useFinancialState` owns current app mutations and refreshes the canonical Supabase workspace after successful writes. Server actions validate with Zod, derive `user_id` via `requireUserId`, and return `ActionResult`.

### Existing public contracts

- Server actions must not trust client `user_id`.
- Hook callbacks surface action errors and refresh on success.
- Route pages use `PageFrame` and client page adapters.

### Existing test conventions

- Action tests mock `requireUserId` and assert exact Supabase calls.
- Panel tests use Testing Library and user-event.
- Page-adapter tests mock feature panels and assert prop identity.

### Risks identified before implementation

- Delete-my-data needed a bounded definition to avoid unapproved Supabase Auth account deletion.
- Broad `e2e/spendguard.spec.ts` remained stale/non-isolated from Phase 6 and was not suitable as the clean Phase 7 gate.

## Implementation design

### Chosen approach

Added three small feature surfaces: `expenses`, `debts`, and `settings`. Each owns its server actions, panel, tests, and export. The existing central hook exposes the new mutations to route adapters, preserving the app's single workspace refresh path.

### Reused components

- `expenseSchema`, `debtSchema`, and `financialProfileSchema` — server-side validation.
- `requireUserId` — authenticated Supabase action boundary.
- `useFinancialState` — app mutation/refresh orchestration.
- `PageFrame`, `Card`, `Button`, and form field components — consistent app UI.

### New components

- `ExpensesPanel` — expense summary, create/edit/delete form flow.
- `DebtsPanel` — debt summary, create/edit/delete form flow.
- `SettingsPanel` — financial profile edit form and guarded delete-financial-data control.

### Alternatives rejected

#### Reusing onboarding setup for settings

- Reason rejected: onboarding replaces all expenses/debts/goals in bulk and would be unsafe for edit-later settings.
- Risk avoided: accidental deletion of unrelated workspace rows.

#### Deleting the Supabase Auth account

- Reason rejected: requires service-role/admin behavior outside the current user-scoped server action boundary.
- Risk avoided: destructive account operation without explicit product approval.

### Architectural invariants preserved

- Deterministic calculation code was untouched.
- All new writes derive `user_id` server-side.
- Updates/deletes are scoped by current authenticated user.
- UI remains a thin consumer of hook callbacks.

## Behavior implemented

### Expense management

Users can open `/expenses`, view expense metrics/cards, create expenses, edit existing expenses, and delete expenses.

Evidence:

- `src/features/expenses/api/manage-expense.test.ts`
- `src/features/expenses/components/expenses-panel.test.tsx`
- targeted Playwright smoke for `/expenses`

### Debt management

Users can open `/debts`, view debt metrics/cards, create debts, edit existing debts, and delete debts. Due days stay on `snapshot.debts` for the Phase 3 30-day debt window.

Evidence:

- `src/features/debts/api/manage-debt.test.ts`
- `src/features/debts/components/debts-panel.test.tsx`
- targeted Playwright smoke for `/debts`

### Settings management

Users can open `/settings`, update profile fields, and use a guarded delete-financial-data control. The delete action removes app financial rows for the current user and keeps the login account.

Evidence:

- `src/features/settings/api/manage-settings.test.ts`
- `src/features/settings/components/settings-panel.test.tsx`
- targeted Playwright smoke for `/settings` checked the confirmation guard only; it did not mutate beta data.

### Error and edge-case behavior

- Invalid action payloads return field errors before auth/database access.
- Missing update/delete IDs return friendly errors.
- Database failures return user-safe error strings and log server-side context.
- Client forms reject blank numeric fields instead of treating them as zero.

## Files changed

| File | Change | Purpose |
| --- | --- | --- |
| `src/features/expenses/**` | new | Expense actions, panel, tests, export |
| `src/features/debts/**` | new | Debt actions, panel, tests, export |
| `src/features/settings/**` | new | Settings actions, panel, tests, export |
| `src/app/(app)/expenses/page.tsx` | new | Expenses route |
| `src/app/(app)/debts/page.tsx` | new | Debts route |
| `src/app/(app)/settings/page.tsx` | new | Settings route |
| `src/app/(app)/_components/page-adapters.tsx` | modified | New route adapters |
| `src/app/(app)/_components/page-adapters.test.tsx` | modified | Adapter tests |
| `src/hooks/use-financial-state.ts` | modified | Expense/debt/settings hook callbacks |
| `src/hooks/use-financial-state.test.tsx` | modified | Hook coverage |
| `src/components/layout/app-navigation.tsx` | modified | Real Expenses/Debts/Settings links |
| `src/components/layout/app-shell.test.tsx` | modified | Navigation regression coverage |
| `src/features/auth/api/auth-routing.test.ts` | modified | New protected-route expectations |
| `tasks/mvp-completion/ROADMAP.md` | modified | Mark Phase 7 done |
| `tasks/mvp-completion/CURRENT_GOAL.md` | new | Phase 7 goal before archive |
| `tasks/mvp-completion/STATUS.md` | new | Phase 7 status before archive |

### Files intentionally not changed

- `src/lib/calculations/**` — Phase 7 only manages inputs; deterministic formulas remain the source of truth.
- `e2e/spendguard.spec.ts` — broad E2E hardening belongs to Phase 12.
- Supabase migrations — existing schema already supports Phase 7.

### Scope exceptions

None.

## Database and migration changes

Not applicable. Phase 7 used existing `profiles`, `expenses`, `debts`, `goals`, `purchase_checks`, `cooldown_items`, `weekly_reports`, `transactions`, and `voice_sessions` tables.

### Data-safety evidence

- Create actions insert server-derived `user_id`.
- Update/delete actions scope by `id` and `user_id`.
- Delete-financial-data deletes only rows matching the authenticated `user_id`.
- Targeted browser smoke did not submit create/update/delete mutations against beta data.

## Tests added or changed

| Test | Coverage |
| --- | --- |
| `src/features/expenses/api/manage-expense.test.ts` | Expense action validation, auth boundary, scoped update/delete, DB errors |
| `src/features/expenses/components/expenses-panel.test.tsx` | Expense panel render/create/update/delete/validation |
| `src/features/debts/api/manage-debt.test.ts` | Debt action validation, auth boundary, scoped update/delete, optional interest |
| `src/features/debts/components/debts-panel.test.tsx` | Debt panel render/create/update/delete/validation |
| `src/features/settings/api/manage-settings.test.ts` | Profile settings upsert and scoped delete-financial-data |
| `src/features/settings/components/settings-panel.test.tsx` | Settings form update, validation, delete confirmation |
| `src/hooks/use-financial-state.test.tsx` | New mutation callbacks and failure propagation |
| `src/app/(app)/_components/page-adapters.test.tsx` | New adapter prop/callback wiring |
| `src/components/layout/app-shell.test.tsx` | Navigation links to real Phase 7 routes |
| `src/features/auth/api/auth-routing.test.ts` | New protected routes |

### Coverage boundaries

- Broad `e2e/spendguard.spec.ts` still has known stale assumptions and was not used as the clean Phase 7 gate.
- Delete-financial-data was tested through mocked action calls and UI confirmation; the browser smoke intentionally did not confirm deletion against hosted beta data.

## Verification results

### Focused checks

| Check | Command | Result |
| --- | --- | --- |
| Phase 7 focused suite | `npm test -- src/features/expenses src/features/debts src/features/settings src/hooks/use-financial-state.test.tsx "src/app/(app)/_components/page-adapters.test.tsx" src/components/layout/app-shell.test.tsx src/features/auth/api/auth-routing.test.ts` | PASS, 10 files / 59 tests |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS, 0 errors / 271 warnings |
| Security audit | `npm audit --audit-level=high` | PASS, found 0 vulnerabilities |

### Public-path or integration checks

| Check | Command | Result |
| --- | --- | --- |
| Targeted browser smoke | inline Playwright smoke against `127.0.0.1:3102` with hosted beta login | PASS, `SMOKE_PASS /expenses`, `/debts`, `/settings` |

### Regression checks

| Check | Command | Result |
| --- | --- | --- |
| Full suite | `npm test` | PASS, 43 files / 225 tests |
| Coverage | `npm run test:coverage` | PASS, 91.32% statements / 81.94% branches |
| Build | `npm run build` | PASS, build lists `/expenses`, `/debts`, `/settings` |

### Diff and scope checks

| Check | Command | Result |
| --- | --- | --- |
| Diff formatting | `git diff --check` | PASS |
| Changed files | `git diff --name-only` + `git status --short` | PASS with unrelated local dirt excluded |
| Forbidden files untouched | inspection | PASS |

### Unrelated or environment-blocked checks

| Check | Reason | Impact |
| --- | --- | --- |
| Broad `e2e/spendguard.spec.ts` | Known stale/non-isolated failures from Phase 6 | Covered Phase 7 public paths with targeted browser smoke instead |

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| `/expenses` supports create, edit, and delete through authenticated actions | action, panel, hook, adapter tests + smoke | VERIFIED |
| `/debts` supports create, edit, and delete through authenticated actions | action, panel, hook, adapter tests + smoke | VERIFIED |
| `/settings` supports profile edits | action, panel, hook, adapter tests + smoke | VERIFIED |
| Delete-financial-data removes app rows for current user only | settings action tests and guarded UI smoke | VERIFIED |
| Debt due dates remain in `snapshot.debts` | adapter/hook/panel wiring and existing mapper path | VERIFIED |
| Existing behavior unchanged | `npm test`, typecheck, coverage, build | VERIFIED |
| Public entry point works | targeted Playwright smoke | VERIFIED |
| No forbidden files changed | scope review | VERIFIED |
| Diff is structurally valid | `git diff --check` | VERIFIED |

## Acceptance-criteria results

- [x] `/expenses` supports expense CRUD — implemented and tested.
- [x] `/debts` supports debt CRUD with due dates — implemented and tested.
- [x] `/settings` supports profile edits — implemented and tested.
- [x] Delete-my-data exists and is bounded to app financial rows — implemented and tested.
- [x] Auth/RLS boundary preserved — server actions derive `user_id` and scope writes.
- [x] Public paths verified — route adapter/component tests and Playwright smoke passed.
- [x] No next phase started — dashboard/report/advisor/privacy broad work untouched.

## Independent review

### Correctness review

- Reviewer: `Codex no-edit review`
- Verdict: `PASS`

Findings:

- None.

### Regression review

- Reviewer: `Codex no-edit review`
- Verdict: `PASS`

Findings:

- None.

### Simplification review

- Reviewer: `Codex no-edit review`
- Verdict: `PASS`

Findings:

- None.

## Repair history

- Focused tests initially failed on stale expected Zod range messages and an ambiguous duplicate `2` in the expense summary test. Tests were corrected to match Zod v4 output and scope the metric query; rerun passed.
- Lint initially failed on `setState` inside a settings form effect. The effect was removed; rerun passed.

## Deviations from the original goal

None.

## Remaining risks and limitations

- Delete-financial-data keeps the Supabase Auth account; account deletion remains a future product decision.
- Broad E2E remains stale/non-isolated and belongs to Phase 12.
- Unrelated local dirt remains in `CLAUDE.md`, `package.json`, `.agents/`, `.claude/`, `.codex/`, and Supabase temp directories; it must stay out of the Phase 7 checkpoint.

## Follow-up work

- Phase 8 may rely on live updated expenses/debts/settings in `snapshot`.
- Phase 11 may add broader privacy copy/transcript controls/account-deletion decisions.
- Phase 12 should repair the broad E2E suite.

## Guidance for the next milestone

The next milestone may rely on:

- `/expenses`, `/debts`, and `/settings` routes existing.
- `useFinancialState` exposing expense/debt/settings mutations.
- Debt due dates being editable and still present in `snapshot.debts`.

The next milestone must not assume:

- Supabase Auth account deletion exists.
- Broad `e2e/spendguard.spec.ts` is currently clean.

### Recommended next milestone

`8 — Dashboard completeness` — Phase 7 closes edit-later inputs, so dashboard cards can now rely on current expense/debt/settings state.

## Human review checklist

- [ ] Review the complete Phase 7 diff only.
- [ ] Confirm unrelated local dirt is excluded from staging.
- [ ] Inspect server actions for auth/RLS scoping.
- [ ] Confirm delete-financial-data boundary is acceptable.
- [ ] Confirm all required tests were executed.
- [ ] Confirm report claims match evidence.

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
