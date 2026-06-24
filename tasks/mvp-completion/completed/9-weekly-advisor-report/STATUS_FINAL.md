# Milestone Status: 9 — Weekly advisor report from real metrics

## Metadata

- Feature: `mvp-completion`
- Phase: `9`
- Goal: `tasks/mvp-completion/CURRENT_GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 9; PRD §11.7, §13 Story 6)
- Branch: `main`
- State: `READY FOR HUMAN REVIEW`
- Last updated: `2026-06-24`
- Updated by: `Claude Code`

> Verified green: typecheck, lint (0 errors), `npm test` 46 files / 263 tests, coverage 91.66/82.22/95.21/91.66, build. Independent review (ecc:code-reviewer): SAFE TO CHECKPOINT after 2 MINOR fixes. Checkpoint patch `9-weekly-advisor-report.patch` (sha256 a44731f0…, base 3e220f8). Archived; committed + pushed per user-approved per-phase checkpoint.

## Current objective

Replace static weekly-report insights with a deterministic rule-based generator (wins/risks/goal-progress/next-best-action + good-decision & amount-preserved metrics) from the week's checks + snapshot, store a richer narrative, and show report history. No LLM.

## Current step

Writing `generateWeeklyReportInsights` test-first.

## Completed prior phases

- P1–P8 (archived). P7 + P8 committed + pushed (HEAD `3e220f8`); base is clean.

## Investigation findings

- `ReportsPanel({ reports, currency, onGenerateReport })` (only caller: `ReportsPageContent` in page-adapters). Static insights via `buildReferenceInsights`; "Good Decisions" hardcoded "3".
- Existing `reports-panel.test.tsx` asserts the section labels (keep them) but not their values → values can become data-driven without breaking it.
- `weekly_reports` table + RLS + mapper + `createWeeklyReportAction` + hook `generateWeeklyReport` (l.408) already exist; hook builds a bare summary string inline.
- Hook uses date-fns `startOfWeek(new Date(), { weekStartsOn: 1 })` (Monday weeks).
- `PurchaseCheck` carries `createdAt`, `decision`, `status` (checked/bought/skipped), `amount` — enough for win/risk counts.

## Remaining work

- [ ] `generateWeeklyReportInsights` pure generator + unit tests
- [ ] `frontend-design` applied for the data-driven cards + history list
- [ ] reports-panel: data-driven cards + history list (+ `checks`/`snapshot` props)
- [ ] page-adapters: pass `checks`/`snapshot`
- [ ] hook: store generator narrative
- [ ] extend reports-panel test (public path) + keep existing green
- [ ] regression + lint + typecheck + coverage ≥ 80% + build
- [ ] independent review → repair
- [ ] report → commit + push → archive

## Verification status

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | NOT RUN | — |
| Lint | `npm run lint` | NOT RUN | — |
| Focused test | `npm test -- src/features/reports` | NOT RUN | — |
| Regression suite | `npm test` | NOT RUN | — |
| Coverage (≥80%) | `npm run test:coverage` | NOT RUN | — |
| Build | `npm run build` | NOT RUN | — |
| Diff check | `git diff --check` | NOT RUN | — |

## Blockers and open questions

None.

## Remaining risks

- Stored summaries created before P9 stay bare (only new reports get the richer narrative) — acceptable; history still renders them.

## Next action

Write `src/features/reports/lib/weekly-report.test.ts` (RED), then implement the generator.

## Scope confirmation

- [ ] No next-phase work started
- [ ] No forbidden files modified
- [ ] No unrelated refactor introduced
- [ ] No tests weakened or removed
- [ ] No RLS / validation bypassed
- [ ] Commit/push only the completed P9 (user-approved per-phase)

## Human review readiness

- State: `NOT READY`
