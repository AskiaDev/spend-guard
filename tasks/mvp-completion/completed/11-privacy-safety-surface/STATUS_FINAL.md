# Milestone Status: 11 — Privacy & safety surface

## Metadata

- Feature: `mvp-completion`
- Phase: `11`
- Goal: `tasks/mvp-completion/CURRENT_GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 11; PRD §28, §11.8)
- Branch: `main`
- State: `READY FOR HUMAN REVIEW`
- Last updated: `2026-06-24`
- Updated by: `Claude Code`

## Current objective

Surface privacy & safety controls: global financial disclaimer + inline advisor disclaimer, voice-privacy note, delete-voice-transcripts control, and a real cross-user RLS isolation test.

## Current step

Complete. All deliverables implemented, verified (329 tests, coverage ≥80%, build green, remote RLS isolation proven rollback-only), independently reviewed (`SAFE TO CHECKPOINT`), report drafted, patch captured. Awaiting human review.

## Decisions made

### RLS test runs against the REMOTE, rollback-only (user directive 2026-06-24)

- Decision: Run the cross-user RLS isolation test against the linked remote `dknftjlcimtfmasrunbj`, wrapped in `BEGIN … ROLLBACK` so nothing persists, via a Supabase MCP `execute_sql` tool the user will wire.
- Reason: Explicit user instruction ("use the remote supabase not the local one for testing"); rollback-only keeps a possibly-production DB residue-free, satisfying the no-prod-data-changes boundary.
- Alternatives rejected: local `supabase test db` (contradicts directive); persist+cleanup on remote (residue risk if teardown interrupted).
- Impact: The remote MCP server is not yet connected — this single step is BLOCKED on that wiring; all other Phase 11 work proceeds independently.

## Completed prior phases

- P1–P10 (archived under `completed/`): app shell, §19 engine, voice checker + `voice_sessions`, settings + delete-all-data, per-user RLS on all tables.

## Investigation findings

- Local Supabase stack RUNNING — psql reachable on `127.0.0.1:54322`; `supabase test db` (pgTAP) viable for a real RLS test.
- `voice_sessions(transcript, extracted_fields)` has `voice_sessions_all_own` RLS; deleted only in bulk today (no granular delete).
- Settings wiring: `page-adapters.SettingsPageContent` → `SettingsPanel`, delete methods from `useFinancialState` (`deleteFinancialData` ~L400, returned ~L491).
- Voice ready stage ~L400–438 is the privacy-note site.
- **PRD §28 exact string is NOT in the repo** — ship a flagged standard disclaimer; human confirms copy.
- Advisor result rendered by `advisor-explanation.tsx` / `purchase-result.tsx` (inline disclaimer site).

## Remaining work

- [x] Invoke `frontend-design` skill
- [x] `FinancialDisclaimer` component + test (footer + inline variants)
- [x] Mount global disclaimer in `AppShell`; inline by advisor explanation
- [x] Voice-privacy note (verified cloud-gated flow → accurate copy)
- [x] `deleteVoiceSessionsAction` + unit test
- [x] `deleteVoiceTranscripts` hook method + test; wire `page-adapters`
- [x] Settings delete-transcript control + test
- [x] Cross-user RLS test (`supabase/tests/rls_isolation_test.sql`) → remote rollback-only
- [x] Regression + lint + typecheck + coverage ≥80% + build
- [x] Independent review (`SAFE TO CHECKPOINT`)
- [x] Report + checkpoint patch
- [ ] Human diff review

## Files changed

17 files (see REPORT_DRAFT.md "Files changed"). New: `financial-disclaimer.tsx(+test)`, `supabase/tests/rls_isolation_test.sql`. Modified: app-shell, advisor-explanation, voice checker, manage-settings, use-financial-state, page-adapters, settings-panel (+ their tests). `CLAUDE.md` shows modified but PRE-EXISTED this phase — excluded from the patch.

## Verification status

| Check | Command | Result | Evidence |
| ----- | ------- | ------ | -------- |
| Typecheck | `npm run typecheck` | PASS | clean |
| Lint | `npm run lint` | PASS | 0 errors (271 pre-existing warnings) |
| Focused tests | `vitest run <7 files>` | PASS | 40/40 |
| RLS (remote, rollback-only) | `execute_sql` @ `dknftjlcimtfmasrunbj` | PASS | `RLS_ISOLATION_OK`; residue check all 0 |
| Regression | `npm test` | PASS | 329/329 (58 files) |
| Coverage (≥80%) | `npm run test:coverage` | PASS | stmts 92 / branch 81.59 / func 94.9 / lines 92.12 |
| Build | `npm run build` | PASS | all routes |
| Diff check | `git diff --check` | PASS | no issues |
| Scope check | `git diff --name-only` | PASS | all allowed; CLAUDE.md excluded |

## Blockers and open questions

None blocking. Open (non-blocking): PRD §28 exact disclaimer string unavailable in repo — using a flagged standard disclaimer pending human confirmation.

## Remaining risks

- §28 copy may need to be replaced with the canonical PRD string (display-only, reversible).
- pgTAP/`supabase test db` mechanics unproven in this repo (no `supabase/tests/` yet) — fallback: action-level isolation test + documented gap.

## Claim-to-evidence progress

All 11 completion claims `VERIFIED` — see REPORT_DRAFT.md claim-to-evidence matrix.

## Review findings

- Correctness: `PASS` (SAFE TO CHECKPOINT) — 2 IMPORTANT (voice copy accuracy → verified accurate, no change; RLS sparse seed → documented fragility), 2 MINOR (deliberate choices). No BLOCKING.
- Regression: `PASS` — 329 tests pass.
- Simplification: `PASS` — no speculative abstraction.

## Next action

Human: review the checkpoint patch (`completed/11-privacy-safety-surface/11-privacy-safety-surface.patch`), confirm the disclaimer/voice copy (or supply the verbatim PRD §28 string), then commit. Roadmap P11 is complete; P12 is the only remaining phase.

## Scope confirmation

- [x] No next-phase (P12) work started
- [x] No forbidden files modified
- [x] No unrelated refactor introduced
- [x] No tests weakened or removed
- [x] No RLS / validation bypassed
- [x] No commit, push, merge, rebase, or deployment performed

## Human review readiness

- State: `READY WITH KNOWN RISKS`

Known risks: PRD §28 exact disclaimer string not in repo (standard copy shipped, reversible); live authenticated-screen Playwright deferred to P12 (public path covered by RTL + build).
