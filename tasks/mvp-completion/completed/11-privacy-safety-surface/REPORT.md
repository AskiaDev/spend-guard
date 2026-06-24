# Milestone Report: 11 — Privacy & safety surface

## Report metadata

- Feature: `mvp-completion`
- Phase: `11`
- Goal: `tasks/mvp-completion/completed/11-privacy-safety-surface/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 11; PRD §28, §11.8)
- Branch: `main`
- Commit: `NOT COMMITTED` (checkpoint patch only — user commits)
- Checkpoint patch: `tasks/mvp-completion/completed/11-privacy-safety-surface/11-privacy-safety-surface.patch`
- Patch SHA-256: `b523d721e6302aeaf847cf9740f0873c1d9d8f3ebc78eb7adcba9c58bf6e07ee`
- Base commit SHA: `9d2f4236e3d797621befe6a35707fb7efe6727aa`
- Started: `2026-06-24`
- Finished: `2026-06-24`
- Implemented by: `Claude Code`
- Reviewed by: `ecc:code-reviewer (independent subagent)`
- Outcome: `COMPLETE`

## Outcome summary

Added SpendGuard's privacy & safety surface: a reusable financial disclaimer mounted app-wide (every authenticated `(app)` screen) and inline with the advisor explanation; an accurate voice-privacy note; a granular "delete voice transcripts" control (server action + hook method + page-adapter wiring + Settings UI) sitting beside the existing delete-all-data control; and a real cross-user RLS isolation test. The RLS test was run against the **remote** project per the user's directive, rollback-only, and proved isolation with zero residue. All 329 unit/component tests pass, typecheck and build are clean, coverage holds at ≥80%, and an independent review returned `SAFE TO CHECKPOINT` with no blocking findings. The deterministic §19 engine was not touched.

## Original objective

> Surface SpendGuard's privacy & safety controls: an explicit financial disclaimer on the decision screens, a voice-privacy note, a granular "delete saved voice transcripts" control alongside the existing delete-all-data control, and a real cross-user RLS isolation test proving one user cannot read or delete another user's rows.

### In scope

- Reusable financial disclaimer (footer + inline variants), mounted globally and by the advisor.
- Voice-privacy note in the voice checker.
- `deleteVoiceSessionsAction` + `deleteVoiceTranscripts` hook method + Settings control.
- Cross-user RLS denial test (`voice_sessions`, `profiles`, `expenses`).

### Explicitly out of scope

- Auth-account (login) deletion (out of scope since P7).
- New Playwright journeys / 80% e2e coverage hardening (P12).
- §19 decision changes, advisor model logic (P10), transcript encryption, advisor rate-limiting / model-URL allowlist.

## Starting repository state

- App shell (`app-shell.tsx`) wraps all `(app)` screens via the auth-gated `(app)/layout.tsx`.
- §19 deterministic engine (`src/lib/calculations/**`) is the single decision source.
- Voice checker persists `voice_sessions(transcript, extracted_fields)` via `saveVoiceSessionAction`.
- Settings (P7): `deleteFinancialDataAction` bulk-deletes all 9 per-user tables (incl. `voice_sessions`); wired hook → page-adapters → `SettingsPanel`.
- Per-user RLS on every table (`*_all_own`, `profiles_*_own`), migrations `20260620000000` + `20260620054500`.

### Existing work preserved

- The existing delete-all-data control and `deleteFinancialDataAction` are unchanged.
- The voice capture/extraction flow and `saveVoiceSessionAction` are unchanged.
- RLS policies are unchanged — Phase 11 *tests* them, it does not modify them (no migration).

## Exploration findings

### Existing execution path

Settings: `page-adapters.SettingsPageContent` → `<SettingsPanel>`; delete/update callbacks come from `useFinancialState` (`useCallback` → server action → `refresh()`). Voice: browser Web Speech API → optional cloud extraction POST to `/api/advisor/extract` → on confirm, `saveVoiceSessionAction` persists the transcript.

### Existing architectural ownership

Trust/legal copy did not exist anywhere; the voice checker had no privacy text; transcript deletion existed only as part of the bulk wipe.

### Existing public contracts

`ActionResult` envelope, `requireUserId()` server-side auth, the `useFinancialState` callback+refresh pattern, and the `SettingsPanel` prop contract — all reused and kept compatible (one new required prop, single caller updated).

### Existing test conventions

Vitest + RTL (jsdom), mocked Supabase client / mocked `requireUserId`; `next/navigation` mocked per-file; `vi.hoisted` action mocks in the hook test. No SQL-level RLS test existed before this phase.

### Risks identified before implementation

- PRD §28 "exact string" is not in the repo (only the redesign design spec + ROADMAP reference PRD sections).
- A real RLS test mutates data; targeting a remote (possibly production) DB needs a residue-free design.

## Implementation design

### Chosen approach

- `FinancialDisclaimer({variant})` — one small, display-only server-compatible component (no `use client`, no hooks), reused in the server-rendered `AppShell` footer and the client `AdvisorExplanation`. Quiet, muted styling matching the existing system (`ShieldCheck`, hairline border, `text-muted`).
- Voice note: a styled `<p>` in the ready stage, copy matched to the real (cloud-gated) data flow.
- `deleteVoiceSessionsAction`: mirrors `deleteFinancialDataAction` exactly but targets only `voice_sessions`. Hook method + page-adapter prop + a second danger-zone card with its own confirm.
- RLS test: a single self-rolling-back `DO` block (see below).

### Reused components

- `requireUserId`, `ActionResult`, `useCallback`+`refresh`, `page-adapters` wiring, `Card`/`Button`/`cn`, `ShieldCheck`.

### New components

- `src/components/legal/financial-disclaimer.tsx` — the disclaimer.
- `deleteVoiceSessionsAction` (settings api), `deleteVoiceTranscripts` (hook), the Settings "Delete voice transcripts" card.
- `supabase/tests/rls_isolation_test.sql` — the RLS isolation test.

### Alternatives rejected

#### Local `supabase test db` (pgTAP) for RLS
- Reason rejected: user directed testing against the **remote**, not local.
- Risk avoided: testing a DB that is not the source of truth.

#### Persist-then-cleanup RLS test on remote
- Reason rejected: residue risk on a production DB if teardown is interrupted.
- Risk avoided: leaking test users/rows into production. Replaced with rollback-only.

### Architectural invariants preserved

- `src/lib/calculations/**` untouched (empty in the diff).
- The disclaimer is display-only — no path to influence a decision.
- Server actions derive `user_id` from Supabase Auth; RLS isolation preserved (and now explicitly proven).

## Behavior implemented

### Financial disclaimer everywhere + by the advisor

Persistent disclaimer on every `(app)` screen (`AppShell`) and inline beside the advisor explanation (§11.8).

Evidence: `financial-disclaimer.test.tsx`, `app-shell.test.tsx` ("shows the financial disclaimer on every shell screen"), `advisor-explanation.test.tsx` ("carries an inline not-financial-advice disclaimer").

### Voice-privacy note

The ready stage states the transcript **may** be sent to an AI service (accurate: the cloud POST is gated on `isTransportConfigured("cloud")`; regex-only setups make no network call), that saved checks store it, and that it is deletable in Settings.

Evidence: `voice-purchase-checker.test.tsx` ("surfaces a voice privacy note before capture").

### Delete voice transcripts (granular)

`deleteVoiceSessionsAction` deletes only the authenticated user's `voice_sessions`; surfaced as its own confirm-gated Settings control, independent of delete-all.

Evidence: `manage-settings.test.ts` (isolation + error + unauthenticated), `settings-panel.test.tsx` ("deletes only voice transcripts after its own confirmation" — also asserts delete-all is not called), `use-financial-state.test.tsx` (success + error paths), `page-adapters.test.tsx` (prop identity).

### Cross-user RLS isolation (real remote DB)

Within one rolled-back transaction: user B sees 0 of user A's `voice_sessions`/`profiles`/`expenses`, B's DELETE affects 0 of A's rows, and owner A still sees its own row.

Evidence: `execute_sql` on remote `dknftjlcimtfmasrunbj` returned `ERROR: P0001: RLS_ISOLATION_OK` (the success sentinel that forces rollback); a follow-up read confirmed `leftover_users=0, leftover_transcripts=0, leftover_expenses=0`.

### Error and edge-case behavior

- Invalid/failed Supabase delete → friendly `{ok:false}` error; unauthenticated → error surfaced from `requireUserId`.
- Each Settings delete control requires its own confirmation before firing.
- Disclaimer is deterministic display text (no inputs, same output).

## Files changed

| File | Change | Purpose |
| ---- | ------ | ------- |
| `src/components/legal/financial-disclaimer.tsx` | new | Disclaimer component (footer + inline) |
| `src/components/legal/financial-disclaimer.test.tsx` | new | Disclaimer tests |
| `src/components/layout/app-shell.tsx` | modified | Mount disclaimer app-wide |
| `src/components/layout/app-shell.test.tsx` | modified | Assert global disclaimer |
| `src/features/purchase-checker/components/advisor-explanation.tsx` | modified | Inline disclaimer by advisor |
| `src/features/purchase-checker/components/advisor-explanation.test.tsx` | modified | Assert inline disclaimer |
| `src/features/voice/components/voice-purchase-checker.tsx` | modified | Voice-privacy note |
| `src/features/voice/components/voice-purchase-checker.test.tsx` | modified | Assert privacy note |
| `src/features/settings/api/manage-settings.ts` | modified | `deleteVoiceSessionsAction` |
| `src/features/settings/api/manage-settings.test.ts` | modified | Action tests |
| `src/hooks/use-financial-state.ts` | modified | `deleteVoiceTranscripts` |
| `src/hooks/use-financial-state.test.tsx` | modified | Hook tests |
| `src/app/(app)/_components/page-adapters.tsx` | modified | Wire `onDeleteVoiceTranscripts` |
| `src/app/(app)/_components/page-adapters.test.tsx` | modified | Wiring test + mock field |
| `src/features/settings/components/settings-panel.tsx` | modified | Delete-transcripts card |
| `src/features/settings/components/settings-panel.test.tsx` | modified | Control test |
| `supabase/tests/rls_isolation_test.sql` | new | Cross-user RLS isolation test |

### Files intentionally not changed

- `src/lib/calculations/**` — decision engine; read-only reuse.
- Existing migrations — RLS already exists; the phase adds a test, not a schema change.

### Scope exceptions

`None.` (`CLAUDE.md` shows as modified in the working tree but that edit pre-existed this phase — it is excluded from the checkpoint patch and is not Phase 11 work.)

## Database and migration changes

`Not applicable` — no schema/data changes. The RLS test runs rollback-only and persists nothing.

### RLS test execution (remote, rollback-only)

```text
execute_sql @ dknftjlcimtfmasrunbj → ERROR: P0001: RLS_ISOLATION_OK   (intentional rollback sentinel = PASS)
residue check → { leftover_users: 0, leftover_transcripts: 0, leftover_expenses: 0 }
```

### Data-safety evidence

- Single `DO` block; a raised exception aborts the transaction → no `COMMIT`, nothing persists (verified by the residue check).
- RLS enforces per-user isolation (now proven cross-user).
- No production data modified (zero residue).

## Tests added or changed

| Test | Coverage |
| ---- | -------- |
| `financial-disclaimer.test.tsx` | Both variants render required phrases; class passthrough |
| `app-shell.test.tsx` | Disclaimer present on a shell screen |
| `advisor-explanation.test.tsx` | Inline disclaimer present |
| `voice-purchase-checker.test.tsx` | Privacy note present + accurate |
| `manage-settings.test.ts` | Action isolates by user; error + unauthenticated paths |
| `settings-panel.test.tsx` | Confirm-gated control; delete-all independence |
| `use-financial-state.test.tsx` | Hook success (action+refresh) and error path |
| `page-adapters.test.tsx` | `onDeleteVoiceTranscripts` wired to hook method |

### Coverage boundaries

- Live authenticated-screen Playwright snapshot not run (needs `E2E_SUPABASE_*` creds, unavailable here; disclaimer renders only on authed screens). Public path is covered by RTL tests that render the **real** components + a passing production build. Live Playwright belongs to P12.

## Verification results

### Focused checks

| Check | Command | Result |
| ----- | ------- | ------ |
| All touched-file tests | `vitest run <7 files>` | PASS (40/40) |

### Public-path / integration checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Settings control → action (mocked Supabase) | `settings-panel.test.tsx` + `manage-settings.test.ts` + `page-adapters.test.tsx` | PASS |
| Cross-user RLS isolation (real remote DB) | `execute_sql` (rollback-only) | PASS (`RLS_ISOLATION_OK`, zero residue) |

### Regression checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Full suite | `npm test` | PASS (329/329, 58 files) |
| Lint | `npm run lint` | PASS (0 errors; 271 pre-existing warnings, none from new files) |
| Typecheck | `npm run typecheck` | PASS |
| Coverage | `npm run test:coverage` | PASS (stmts 92%, branches 81.59%, funcs 94.9%, lines 92.12%; gate 80%) |
| Build | `npm run build` | PASS (all routes incl. `/settings`, `/voice`, `/checker/result`) |

### Diff and scope checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Diff formatting | `git diff --check` | PASS |
| Changed files | `git diff --name-only` | PASS (all allowed; CLAUDE.md pre-existing, excluded from patch) |
| Forbidden files untouched | inspection + empty `calculations` diff | PASS |

### Unrelated or environment-blocked checks

| Check | Status | Reason |
| ----- | ------ | ------ |
| Live Playwright on authed screens | BLOCKED | No `E2E_SUPABASE_*` creds; disclaimer only on authenticated screens. Covered by RTL + build; defer live check to P12. |

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Disclaimer on all `(app)` screens | `financial-disclaimer.test.tsx` + `app-shell.test.tsx` | VERIFIED |
| Disclaimer inline by advisor | `advisor-explanation.test.tsx` | VERIFIED |
| Voice-privacy note shown & accurate | `voice-purchase-checker.test.tsx` + `extract-with-model.ts` gate review | VERIFIED |
| Delete-transcript action isolates by user | `manage-settings.test.ts` | VERIFIED |
| Settings control wired (public path) | `settings-panel.test.tsx` + `page-adapters.test.tsx` | VERIFIED |
| Hook method calls action + refresh | `use-financial-state.test.tsx` | VERIFIED |
| Cross-user RLS isolation proven | remote `execute_sql` `RLS_ISOLATION_OK` + residue check | VERIFIED |
| Engine outputs unchanged | `npm test` (329 pass) + empty `calculations` diff | VERIFIED |
| Coverage ≥80% | `npm run test:coverage` | VERIFIED |
| No forbidden files changed | `git diff --name-only` | VERIFIED |
| Diff structurally valid | `git diff --check` | VERIFIED |

## Acceptance-criteria results

- [x] **Financial disclaimer on relevant screens** — global `AppShell` mount + inline advisor; tested.
- [x] **Voice-privacy note surfaced** — ready stage; accurate to the cloud-gated flow; tested.
- [x] **Transcript deletion + account-data deletion** — new `deleteVoiceSessionsAction` control; existing delete-all retained.
- [x] **Cross-user RLS denial test proving isolation** — real remote rollback-only run, `RLS_ISOLATION_OK`, zero residue.

## Independent review

### Correctness review
- Reviewer: `ecc:code-reviewer` (independent)
- Verdict: `PASS` (SAFE TO CHECKPOINT)

Findings:
- `IMPORTANT` Voice copy "may be sent" vs unconditional on a configured deployment — Resolution: verified `extractPurchaseWithModel` is gated on `isTransportConfigured("cloud")`; "may" is accurate across deployments. No change.
- `IMPORTANT` RLS test seeds `auth.users` with a sparse insert (fragile if schema adds NOT NULL cols) — Resolution: it succeeded against the real remote schema (`RLS_ISOLATION_OK`). Documented as a known fragility; left as-is to avoid inserting columns that may not exist.
- `MINOR` Two adjacent danger-zone confirm checkboxes — Resolution: copy clearly distinguishes scope; the test asserts independence. Retained.
- `MINOR` `onDeleteVoiceTranscripts` is required, not optional — Resolution: intentional; matches `onDeleteFinancialData` and forces every caller to wire the privacy control. Retained.

### Regression review
- Reviewer: `ecc:code-reviewer`
- Verdict: `PASS` — 329 tests pass; `app-shell` flex-col change has no functional impact; single `SettingsPanel` caller updated.

### Simplification review
- Reviewer: `ecc:code-reviewer`
- Verdict: `PASS` — no speculative abstraction, dead code, or magic values.

## Repair history

`No significant repair cycles.` One typecheck orphan fixed (the new required hook field had to be added to the `page-adapters.test.tsx` mock state) — caught by `npm run typecheck`, fixed, re-verified green.

## Deviations from the original goal

The RLS test target changed from the local stack (original goal draft) to the **remote** project per the user's mid-phase directive ("use the remote supabase not the local one for testing"), implemented rollback-only via the Supabase MCP. Documented in `STATUS.md` Decisions and the goal.

## Remaining risks and limitations

- **PRD §28 copy** — the canonical exact string is not in the repo; a standard, defensible disclaimer is shipped. A human should confirm/replace it against the authoritative PRD. Display-only, reversible.
- **RLS test seed fragility** — `auth.users` sparse insert relies on the current remote schema accepting it (it does today).
- **Live Playwright** — authenticated-screen snapshot not run here (no e2e creds). Covered by RTL + build; verify in P12.

## Follow-up work

- Replace the disclaimer copy with the verbatim PRD §28 string once available.
- P12: add an authenticated Playwright assertion that the disclaimer and the delete-transcripts control render/behave on the real pages.

## Guidance for the next milestone

The next milestone (P12 — E2E & coverage hardening) may rely on:

- `FinancialDisclaimer` (stable, app-wide), the Settings "Delete voice transcripts" control, `deleteVoiceSessionsAction`, and `supabase/tests/rls_isolation_test.sql`.

The next milestone must not assume:

- That the PRD §28 copy is final, or that any authenticated-screen Playwright coverage exists yet.

### Recommended next milestone

`12 — E2E & coverage hardening` — Reason: it is the only remaining roadmap phase and depends on P4–P11, all now complete.

## Human review checklist

- [ ] Review the complete diff (apply the checkpoint patch)
- [ ] Confirm changed-file scope (note: `CLAUDE.md` is a pre-existing, unrelated edit, excluded from the patch)
- [ ] Inspect security-sensitive behavior (`deleteVoiceSessionsAction` auth/RLS; the RLS test)
- [ ] Confirm the disclaimer copy is acceptable or supply the verbatim PRD §28 string
- [ ] Confirm the voice-privacy note wording is acceptable
- [ ] Confirm all required tests were actually executed (329 pass; remote RLS run)
- [ ] Confirm remaining risks are acceptable
- [ ] Confirm no next-phase (P12) work was started

## Git and deployment status

- Commit created by agent: `NO`
- Pushed by agent: `NO`
- Merged by agent: `NO`
- Deployed by agent: `NO`
- Production data modified: `NO` (RLS test rolled back; zero residue verified)

## Final disposition

- Agent recommendation: `READY FOR HUMAN REVIEW`
- Human decision: `PENDING`
- Human reviewer: `pending`
- Decision date: `pending`
