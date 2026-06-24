# Current Goal: 11 — Privacy & safety surface

## Goal metadata

- Feature: `mvp-completion`
- Phase: `11`
- Status: `READY TO START`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 11; PRD §28, §11.8)
- Previous phase report: `tasks/mvp-completion/completed/10-model-agnostic-advisor/REPORT.md`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Supabase (Auth + Postgres + RLS) + Tailwind / shadcn. Tests: Vitest (jsdom) + RTL; Playwright e2e; pgTAP via `supabase test db`.
- READ FIRST: `AGENTS.md` — "This is NOT the Next.js you know." Read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code.
- Commands (run in CODE ROOT):
    - Typecheck: `npm run typecheck` · Lint: `npm run lint`
    - Tests: `npm test` · single: `npm test -- <path>` · coverage (80% gate): `npm run test:coverage`
    - RLS test: against the **linked REMOTE** project `dknftjlcimtfmasrunbj`, **rollback-only** (`BEGIN … ROLLBACK`, zero persisted residue), via a Supabase **MCP `execute_sql`** tool. SQL kept at `supabase/tests/rls_isolation_test.sql`.
    - E2E: `npm run e2e` (Playwright auto-starts dev on `127.0.0.1:3100`)
- User directive (2026-06-24): run the RLS test against the **remote**, not local. The Vitest suite mocks Supabase (no DB) and is unaffected. The remote MCP server for `dknftjlcimtfmasrunbj` must be wired by the user before this test can run.
- Frontend rule: invoke the `frontend-design` skill before writing UI; verify the real page via Playwright where feasible.
- Git boundary (HARD): never commit/push/merge/rebase/deploy. Capture the finished phase as a patch under `tasks/mvp-completion/completed/11-privacy-safety-surface/`.

## 1. Current project state

Already complete (P1–P10, archived under `completed/`):

- Routed app shell (`src/components/layout/app-shell.tsx`) wrapping every `(app)` screen via `src/app/(app)/layout.tsx` (auth-gated).
- Deterministic §19 rules engine (`src/lib/calculations/**`) — the single source of decisions.
- Voice checker (`src/features/voice/components/voice-purchase-checker.tsx`) + `saveVoiceSessionAction` persisting `voice_sessions(transcript, extracted_fields)` server-side.
- Settings (P7): `/settings` route, `updateProfileSettingsAction`, and `deleteFinancialDataAction` (bulk-deletes all 9 per-user tables incl. `voice_sessions`) wired through `use-financial-state` → `page-adapters` → `SettingsPanel`.
- `voice_sessions` table + `voice_sessions_all_own` RLS policy (`for all using ((select auth.uid()) = user_id)`), and equivalent per-user RLS on every table (migrations `20260620000000`, `20260620054500`).

Do not redo, replace, or redesign completed work. Inspect existing impl + current diff + the P10 report before editing.

## 2. Objective

Implement:

> Surface SpendGuard's privacy & safety controls: an explicit financial disclaimer on the decision screens, a voice-privacy note, a granular "delete saved voice transcripts" control alongside the existing delete-all-data control, and a real cross-user RLS isolation test proving one user cannot read or delete another user's rows.

This milestone owns:

- A reusable financial **disclaimer** component, mounted globally (all `(app)` screens) and inline beside the advisor explanation (§11.8).
- A **voice-privacy note** in the voice checker, accurately describing how the transcript is transcribed, stored, and deleted.
- A **delete-voice-transcripts** server action + hook method + Settings control (the existing `deleteFinancialDataAction` is the account-data deletion; keep it).
- A **cross-user RLS denial test** (pgTAP) proving per-user isolation on `voice_sessions` (+ `profiles`, `expenses`).

This milestone does NOT include:

- Auth account (login) deletion — explicitly out of scope since P7 (keeps login, deletes data only).
- New Playwright **journeys** / the 80% e2e coverage hardening — that is P12. (Live Playwright snapshot for verification only, not a committed new journey.)
- Any change to §19 decision outputs, the advisor model logic (P10), or transcript **encryption**.
- Per-user rate-limiting / model-URL allowlist (deferred P10 follow-ups — not in P11's roadmap row).

## 3. Required behavior

1. A `FinancialDisclaimer` renders persistent disclaimer text on every authenticated `(app)` screen (dashboard, checker, result, voice, reports, goals, settings).
2. The disclaimer also appears inline with the advisor explanation output (the AI text most likely to be mistaken for advice).
3. The voice checker shows a concise privacy note before/at capture, describing transcription locus, that confirmed checks store the transcript to the account, and that it is deletable in Settings — wording matches actual behavior.
4. A new `deleteVoiceSessionsAction()` deletes only the authenticated user's `voice_sessions` rows (derives `user_id` from Supabase Auth; never trusts client input) and returns the standard `ActionResult`.
5. Settings exposes a distinct "Delete voice transcripts" control wired through the hook + page-adapter, with its own confirm + status messaging, leaving the existing delete-all-data control intact.
6. A pgTAP RLS test proves: user B selecting user A's `voice_sessions`/`profiles`/`expenses` returns 0 rows; user B's DELETE affects 0 of user A's rows; user A still sees its own row. Runs green via `supabase test db`.
7. Deterministic engine outputs are untouched; the disclaimer/notes are display-only; RLS and auth derivation are preserved.

## 4. Architectural invariants

1. `src/lib/calculations/**` stays the single source of decisions; this phase adds only display text + a delete path + a test.
2. Reuse existing seams: `requireUserId`, the `ActionResult` envelope, the `useFinancialState` callback+`refresh` pattern, the `page-adapters` wiring, existing UI primitives (`Card`, `Button`).
3. Server actions derive `user_id` from Supabase Auth; never trust a client id; RLS isolation preserved.
4. Existing public APIs / action signatures stay backward-compatible (new action is additive; `SettingsPanel` gains one optional-but-wired prop).
5. New orchestration stays thin; no business logic added.
6. Completed phases are not redesigned.

Stop and report if satisfying the goal would require violating one of these.

## 5. Important behavioral definitions

### Financial disclaimer text (PRD §28)

PRD §28 specifies an "exact string," but **the PRD document is not checked into this repo** (only the redesign design spec + ROADMAP reference PRD sections). Therefore this phase ships a careful, standard "not financial advice / educational estimate / deterministic-engine-decides, AI-only-explains" disclaimer and **flags it for human confirmation against the canonical PRD §28**. This is display-only and trivially reversible.

It must:

- State the output is educational, based only on entered figures, and not financial/investment/tax/legal advice.
- Note the deterministic engine decides and the AI advisor only explains.

It must not:

- Alter, gate, or contradict any §19 decision.
- Claim regulatory/professional endorsement.

### Voice-privacy note

Must accurately describe the real flow (verify before finalizing copy): browser speech-to-text; whether field-extraction sends text to a server route (`/api/advisor/extract`); that confirming a check stores the transcript to `voice_sessions`; that it is deletable in Settings. Do not claim "nothing leaves your device" if extraction posts text server-side.

Do not invent undefined product behavior.

## 6. Existing implementation to inspect

- `src/components/layout/app-shell.tsx` — global mount point (after `{children}` in `<main>`).
- `src/features/purchase-checker/components/advisor-explanation.tsx` — inline disclaimer site (additive only).
- `src/features/voice/components/voice-purchase-checker.tsx` (ready stage ~L400–438) — privacy-note site; `src/features/purchase-checker/api/save-voice-session.ts`; `src/app/api/advisor/extract/route.ts` (confirm whether transcript posts server-side).
- `src/features/settings/api/manage-settings.ts` (+ `.test.ts`) — pattern for `deleteVoiceSessionsAction`.
- `src/features/settings/components/settings-panel.tsx` (+ `.test.tsx`) — delete-control pattern.
- `src/hooks/use-financial-state.ts` (`deleteFinancialData` ~L400; return shape ~L467–491) and `src/app/(app)/_components/page-adapters.tsx` (`SettingsPageContent` ~L150).
- `supabase/migrations/20260620000000_initial_spendguard.sql` + `20260620054500_harden_rls_policies.sql` — RLS policies under test.

Document: current input/output, callers, error behavior, conventions, compatibility risks.

## 7. Allowed files

- `src/components/legal/financial-disclaimer.tsx` (new) + `…/financial-disclaimer.test.tsx` (new)
- `src/components/layout/app-shell.tsx` (mount global disclaimer)
- `src/features/purchase-checker/components/advisor-explanation.tsx` (+ `.test.tsx`) — inline disclaimer (additive; justification: §11.8 ties the disclaimer to the advisor surface)
- `src/features/voice/components/voice-purchase-checker.tsx` (+ `.test.tsx`) — voice-privacy note
- `src/features/settings/api/manage-settings.ts` (+ `.test.ts`) — `deleteVoiceSessionsAction`
- `src/features/settings/components/settings-panel.tsx` (+ `.test.tsx`) — delete-transcript control
- `src/hooks/use-financial-state.ts` (+ `.test.tsx`) — `deleteVoiceTranscripts`
- `src/app/(app)/_components/page-adapters.tsx` — wire `onDeleteVoiceTranscripts`
- `supabase/tests/rls_isolation_test.sql` (new) — pgTAP RLS test
- `tasks/mvp-completion/STATUS.md`

An additional file may be modified only when necessary, documented before editing, and within scope.

## 8. Forbidden files and scope

Do not modify: `src/lib/calculations/**`; advisor model logic (`src/lib/advisor/**`, `src/lib/ai/**`) beyond reading; other phases' completed code; existing migrations (RLS already exists — add a test, not a migration); `e2e/**` new journeys (P12); production/env config.

Do not: begin P12; add auth-account deletion; weaken tests/validation/RLS; refactor unrelated code; commit/push/merge/rebase/deploy.

## 9. Preferred implementation shape

```text
// src/components/legal/financial-disclaimer.tsx
export function FinancialDisclaimer(props: { variant?: "footer" | "inline"; className?: string }): JSX.Element

// src/features/settings/api/manage-settings.ts
export async function deleteVoiceSessionsAction(): Promise<ActionResult<null>>   // requireUserId → from("voice_sessions").delete().eq("user_id", userId)

// src/hooks/use-financial-state.ts
deleteVoiceTranscripts: () => Promise<void>   // calls action, then refresh()
```

Reuse existing logic; minimize new surface; keep novel behavior in testable units; remain reversible.

## 10. Required tests

1. `FinancialDisclaimer` renders the required phrases for both variants (RTL).
2. Global mount: an `(app)` screen shows the disclaimer (RTL on `AppShell` or a page).
3. Inline mount: advisor explanation shows the disclaimer (RTL).
4. Voice note: voice checker renders the privacy note in the ready stage (RTL).
5. `deleteVoiceSessionsAction` deletes only `voice_sessions` for the authed `user_id`; returns `{ok:true}`; on Supabase error returns `{ok:false}`; unauthenticated path surfaces error.
6. Settings control: clicking "Delete voice transcripts" (confirmed) calls `onDeleteVoiceTranscripts`; leaves delete-all control behavior unchanged (RTL).
7. Hook: `deleteVoiceTranscripts` calls the action then `refresh`; error path sets error + throws (RTL/renderHook).
8. **RLS (real REMOTE DB, rollback-only):** within one `BEGIN … ROLLBACK`, create two users, insert owner rows, switch the JWT claim to the other user: cross-user SELECT returns 0; cross-user DELETE affects 0; owner still sees own row — `voice_sessions`, `profiles`, `expenses`. Nothing persists.
9. Determinism/forbidden: no test asserts the disclaimer changes a decision (it must not).

Public-path requirement — at least one test must exercise:

```text
Settings control click → onDeleteVoiceTranscripts → deleteVoiceSessionsAction (mocked Supabase) → voice_sessions delete filtered by user_id
```

## 11. Verification commands

```bash
npm test -- src/components/legal/financial-disclaimer.test.tsx
npm test -- src/features/settings/api/manage-settings.test.ts
npm test -- src/features/settings/components/settings-panel.test.tsx
npm test -- src/features/voice/components/voice-purchase-checker.test.tsx
npm test -- src/features/purchase-checker/components/advisor-explanation.test.tsx
npm test -- src/hooks/use-financial-state.test.tsx
# Cross-user RLS isolation: remote MCP execute_sql runs supabase/tests/rls_isolation_test.sql (BEGIN…ROLLBACK)
npm run typecheck
npm run lint
npm test                              # full regression
npm run test:coverage                 # ≥80% gate
git diff --check && git diff --stat && git diff --name-only && git status --short
```

Live Playwright snapshot of the disclaimer on a real page where feasible (verification only).

## 12. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Disclaimer on all `(app)` screens | `financial-disclaimer.test.tsx` + AppShell render test | NOT VERIFIED |
| Disclaimer inline by advisor | `advisor-explanation.test.tsx` | NOT VERIFIED |
| Voice-privacy note shown | `voice-purchase-checker.test.tsx` | NOT VERIFIED |
| Delete-transcript action isolates by user | `manage-settings.test.ts` | NOT VERIFIED |
| Settings control wired (public path) | `settings-panel.test.tsx` | NOT VERIFIED |
| Hook method calls action + refresh | `use-financial-state.test.tsx` | NOT VERIFIED |
| Cross-user RLS isolation proven | remote MCP `execute_sql` (rollback-only) | NOT VERIFIED |
| Engine outputs unchanged | `npm test` full suite green | NOT VERIFIED |
| Coverage ≥80% | `npm run test:coverage` | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |
| Diff structurally valid | `git diff --check` | NOT VERIFIED |

## 13. Execution workflow

Invoke `frontend-design` before UI. Then per behavior: add/adjust test → observe fail → minimal impl → focused verify → inspect diff → update `STATUS.md`. Finish with public-path + regression + lint + coverage + pgTAP, complete the matrix, independent review, inspect full diff, verify scope.

## 14. Retry and stop conditions

≤3 materially different repair attempts per failure. Stop and report if: the PRD §28 exact string proves to be a hard product blocker (not just copy), a forbidden file appears necessary, an invariant would break, or the remote MCP server for `dknftjlcimtfmasrunbj` is not wired in time (then deliver everything else + the action-level isolation test, leave the remote RLS claim NOT VERIFIED, and report PARTIAL with the exact next step).

## 15. Definition of Done

Every required behavior implemented; invariants preserved; focused tests pass; public path exercised; regression + lint pass; coverage ≥80%; pgTAP RLS test green; no forbidden files changed; `git diff --check` clean; matrix all `VERIFIED`; risks documented (incl. §28 copy flag); `STATUS.md` current; P12 not started.

## 16. Final report

Per `tasks/templates/REPORT_TEMPLATE.md`. Do not commit/push/merge/rebase/deploy.
