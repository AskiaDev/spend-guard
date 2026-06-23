# Supabase Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make configured SpendGuard installations authenticate users with Supabase and persist every active MVP workflow to user-owned Supabase rows.

**Architecture:** The existing deterministic calculations remain client-side. A remote workspace action maps RLS-scoped database rows into the existing finance types, and the hook always uses authenticated Supabase server actions. Supabase configuration and authentication are required; there is no local persistence fallback.

**Tech Stack:** Next.js 16 App Router and Proxy, React 19 `useActionState`, Supabase SSR/Auth/Postgres/RLS, Zod, Vitest, Testing Library, Playwright.

---

### Task 1: Authentication outcomes and confirmation callback

**Files:**
- Create: `src/features/auth/api/auth-result.ts`
- Create: `src/features/auth/api/auth-result.test.ts`
- Create: `src/app/auth/confirm/route.ts`
- Modify: `src/features/auth/api/actions.ts`
- Modify: `src/features/auth/components/auth-form.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/signup/page.tsx`

- [x] Write a failing test proving signup without a session returns a `check_email` state and Supabase errors remain visible.
- [x] Run `npm test -- src/features/auth/api/auth-result.test.ts` and verify the new behavior is missing.
- [x] Add a pure auth-result mapper, Zod credential validation, `useActionState` form feedback, pending state, and an email confirmation callback supporting `code` and `token_hash` flows.
- [x] Run the focused auth tests and confirm they pass.

### Task 2: Authenticated route and account status

**Files:**
- Modify: `src/proxy.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/features/auth/components/auth-status.tsx`
- Modify: `src/app/spendguard-client.tsx`

- [x] Add tests for the account-status rendering and sign-out form.
- [x] Verify the tests fail because status is currently hardcoded to unauthenticated placeholder state.
- [x] Pass authenticated email from the server page, redirect unauthenticated requests to `/login`, redirect authenticated users away from auth pages, and connect `signOutAction`.
- [x] Run the focused component tests.

### Task 3: Supabase row mapping and workspace read

**Files:**
- Create: `src/lib/supabase/finance-mappers.ts`
- Create: `src/lib/supabase/finance-mappers.test.ts`
- Create: `src/features/financial-profile/api/load-financial-workspace.ts`
- Modify: `src/types/finance.ts`
- Modify: `src/lib/storage/default-data.ts`

- [x] Write mapping tests for numeric Postgres values, nullable fields, JSON reasons, cooldown dates, and an account with no profile.
- [x] Run the mapper tests and verify they fail before implementation.
- [x] Add `FinancialWorkspace`, an empty remote snapshot, row mappers, and one authenticated parallel read across profiles, expenses, debts, goals, purchase checks, cooldown items, and weekly reports.
- [x] Fail the read as a single `ActionResult` if any query fails; never substitute sample financial data for a remote account.
- [x] Run the mapper tests.

### Task 4: Remote mutations

**Files:**
- Modify: `src/features/financial-profile/api/save-financial-profile.ts`
- Modify: `src/features/purchase-checker/api/save-purchase-check.ts`
- Modify: `src/features/goals/api/create-goal.ts`
- Modify: `src/features/cooldown/api/create-cooldown-item.ts`
- Modify: `src/features/reports/api/create-weekly-report.ts`
- Create: `src/features/purchase-checker/api/save-voice-session.ts`

- [x] Write action-boundary tests using injected Supabase-like clients to prove validation, authenticated ownership, insert failures, and deletes are handled.
- [x] Run the focused tests and verify missing remote operations fail.
- [x] Return inserted IDs/timestamps where needed, add owner-scoped goal/cooldown deletion, save confirmed voice drafts, and check every profile replacement delete/insert result.
- [x] Keep `requireUserId()` in every public action so no caller can provide `user_id`.
- [x] Run focused action tests.

### Task 5: Storage-mode orchestration

**Files:**
- Modify: `src/hooks/use-financial-state.ts`
- Modify: `src/app/spendguard-client.tsx`
- Modify: `src/features/purchase-checker/components/purchase-checker-panel.tsx`

- [x] Add hook/component tests showing the Supabase-backed state loads empty account data, saves a profile, persists checks/goals/cooldowns/reports, and reports server errors.
- [x] Run the focused tests and verify Supabase-backed orchestration is unsupported.
- [x] Call authenticated server actions for each operation and refresh the remote workspace after successful writes.
- [x] Persist confirmed voice extraction only after the user presses `Confirm fields`.
- [x] Add an accessible workspace error state instead of silently swallowing action failures.
- [x] Run the focused tests.

### Task 6: Documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `e2e/spendguard.spec.ts`

- [x] Document required Supabase URL/key, Site URL, redirect URL, and email-confirmation behavior.
- [x] Require a disposable confirmed Supabase account for E2E; skip browser tests when `E2E_SUPABASE_EMAIL` and `E2E_SUPABASE_PASSWORD` are not provided.
- [x] Run `npm run typecheck`, `npm run lint`, `npm run test:coverage`, `npm run build`, `npm run e2e`, and `npm audit --audit-level=moderate`.
- [ ] Verify the live Supabase security advisor remains clean and the browser reaches `/login` when configured without a session.
  - 2026-06-20: Browser redirect verified. Supabase security advisor is not clean; it reports `auth_leaked_password_protection` as `WARN`.

## Reversibility

- No schema migration, destructive SQL, or service-role key is introduced.
- Supabase is required; removing public environment variables shows an auth configuration notice and disables app data access.
- Reverting the code does not delete users or rows already created in Supabase.
- To revert, restore the previous application revision and leave the existing RLS-protected database unchanged.

## Out of Scope

- Offline synchronization or local browser persistence.
- Social login, password reset, and magic-link login.
- Transaction tracker UI and bank synchronization.
- Disabling Supabase email confirmation.
- Changing the deterministic affordability formulas.
