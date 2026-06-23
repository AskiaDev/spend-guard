# Current Goal: 1 — Integration baseline: verify + repair the merged tree

## Goal metadata

- Feature: `mvp-completion`
- Phase: `1`
- Status: `READY FOR HUMAN REVIEW`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (PRD §16, §31)
- Previous phase report: `none (first phase)`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16.2.9 (App Router, Turbopack) + React 19.2 + TypeScript (strict) + Supabase (Auth + Postgres + RLS) + Tailwind 4 / shadcn. Tests: Vitest 4 (jsdom) + RTL; Playwright e2e.
- READ FIRST: `AGENTS.md` — "This is NOT the Next.js you know." Read `node_modules/next/dist/docs/` before Next-specific code.
- Commands (CODE ROOT): `npm run typecheck` · `npm run lint` · `npm test` · `npm run test:coverage` (80% gate in `vitest.config.mts`) · `npm run build` · `npm run e2e` (Playwright auto-starts dev on 127.0.0.1:3100).
- Git boundary (HARD): never commit/push/merge/rebase/deploy. Capture the phase as a patch under `tasks/mvp-completion/completed/1-integration-baseline/`.

## 1. Current project state

Already complete (merged baseline, commit `7e394e9`):

- Redesigned routed UI (app shell, sidebar nav, mobile header) across `/`, `/checker`, `/checker/result`, `/voice`, `/goals`, `/cooldown`, `/reports`, `/onboarding`, `/login`, `/signup`.
- Supabase persistence as source of truth: server actions for profile, purchase checks, cooldown, goals, weekly reports, voice sessions; `finance-mappers` row↔client transform; RLS migrations.
- `useFinancialState` hook + `FinancialStateProvider` + `(app)/_components/page-adapters` bridge.
- Deterministic calculations under `src/lib/calculations/**` (pre-PRD-§19 model — Phase 3 will realign).

Do not redo, replace, or redesign completed work.

## 2. Objective

> Prove the merged redesign+Supabase tree is a trusted "done" baseline — every gate green and every integration seam consistent — repairing only seams that actually disagree, with no new features.

This milestone owns:

- Running and recording the full gate: typecheck, lint, unit/component tests, build, coverage.
- Auditing the integration seams: `useFinancialState` ↔ server actions ↔ `finance-mappers` ↔ Supabase.
- Confirming `loadFinancialWorkspace` loads a real workspace and degrades safely (no auth / empty).
- Confirming the `local-database.ts` (Dexie) removal orphaned no callers.
- Repairing any seam that genuinely disagrees (type/field/contract drift, dangling refs).

This milestone does not include:

- New features or fields (P2+).
- Rules-engine realignment to PRD §19 (P3).
- Copy polish, enum-fallback hardening, or dead-code cleanup beyond a genuine seam defect.

## 3. Required behavior

1. `npm run typecheck` exits 0.
2. `npm run lint` exits 0 (warnings tolerated; no errors).
3. `npm test` passes (all unit/component tests).
4. `npm run build` exits 0 (all routes + middleware compile).
5. `npm run test:coverage` meets the 80% gate on all four metrics.
6. Every integration seam is consistent; any disagreement found is either repaired or documented as out-of-scope-with-reason.
7. No orphaned references to the removed local/Dexie store.

## 4. Architectural invariants

1. Deterministic engine (`src/lib/calculations/**`) stays the single source of decisions; LLM only explains.
2. Existing formulas, Zod validation, persistence reused, not copied.
3. Server actions derive `user_id` from Supabase Auth — never trust client id.
4. Public server-action signatures stay backward-compatible.
5. Orchestration stays thin; rules stay in the calc/service layer.
6. Completed work not redesigned.

## 5. Important behavioral definitions

### "Trusted baseline"

A tree where the full gate is green AND the seams between hook, server actions, mappers, and Supabase agree on shape/contract, verified by executed commands plus an independent read-only audit.

It must not mean: "build passes, so ship." Seam consistency and the empty/no-auth workspace paths must be confirmed too.

## 6. Existing implementation to inspect

- `src/hooks/use-financial-state.ts`, `src/providers/financial-state-provider.tsx`
- `src/app/(app)/_components/page-adapters.tsx`, `src/app/(app)/layout.tsx`
- `src/features/**/api/*.ts` (server actions), `src/lib/supabase/{server,finance-mappers}.ts`
- `src/features/financial-profile/api/load-financial-workspace.ts`
- `src/types/{finance,database}.ts`, `src/config/env.ts`

## 7. Allowed files

- Integration-seam files above, only where a real disagreement is found.
- `*.test.ts(x)` for any seam repair.
- `tasks/mvp-completion/{CURRENT_GOAL,STATUS}.md` and the archive.

## 8. Forbidden files and scope

- `src/lib/calculations/**` internals (P3).
- New feature files / routes / fields (P2+).
- `supabase/migrations/**` (no schema change in P1).
- production / env configuration.

Do not: start the next phase; weaken tests; bypass RLS/validation; refactor unrelated code; commit/push/merge.

## 9. Preferred implementation shape

```text
Verify-first phase. Expected diff: empty (baseline already correct).
Repair only on a proven seam defect, with the smallest compatible change + a focused test.
```

## 10. Required tests

The existing 132 unit/component tests exercise the public component paths (onboarding, dashboard, checker wizard/result, goals, cooldown, reports, voice) plus server-action and mapper units. P1 adds tests only if a seam repair is made. Full-browser e2e requires a disposable confirmed Supabase account (`E2E_SUPABASE_EMAIL`/`PASSWORD`).

## 11. Verification commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:coverage
git diff --check && git diff --stat -- . ':(exclude)tasks/'
```

## 12. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Typecheck clean | `npm run typecheck` exit 0 | VERIFIED |
| Lint clean (no errors) | `npm run lint` exit 0 | VERIFIED |
| Unit/component suite green | `npm test` 132/132 | VERIFIED |
| Build compiles all routes + middleware | `npm run build` exit 0 | VERIFIED |
| Coverage ≥ 80% (all four metrics) | `npm run test:coverage` 92/82/96/92 | VERIFIED |
| Seams consistent (hook↔action↔mapper↔Supabase) | independent Explore seam audit + diff | VERIFIED |
| `loadFinancialWorkspace` handles real + empty + no-auth | `load-financial-workspace.test.ts` + audit | VERIFIED |
| No orphaned local-database/Dexie refs | repo-wide grep (0 matches) | VERIFIED |
| Full-browser e2e journeys green | `npm run e2e` | BLOCKED (needs human-provided Supabase test creds) |
| No forbidden files changed | `git diff --name-only` (empty) | VERIFIED |
| Diff structurally valid | `git diff --check` | VERIFIED |

## 13. Execution workflow

Inspected repo + diff; ran the full gate; ran an independent seam audit; found no genuine disagreement; confirmed empty code diff; documented the e2e credential gap.

## 14. Retry and stop conditions

≤3 repair attempts per failure. Stop on product decision / contract change / forbidden file. (None hit — no repairs needed.)

## 15. Definition of Done

Met when the gate is green, seams are confirmed consistent, the empty/no-auth workspace paths hold, no orphaned refs remain, coverage ≥80%, no forbidden files changed, `git diff --check` passes, all claims have evidence, and the next phase has not started. The full-browser e2e is the one documented environment gap (credential-gated), with component-level public paths covering the requirement in the interim.

## 16. Final report

See `tasks/mvp-completion/completed/1-integration-baseline/REPORT.md`.

Do not commit, push, merge, rebase, deploy, or modify production data.
