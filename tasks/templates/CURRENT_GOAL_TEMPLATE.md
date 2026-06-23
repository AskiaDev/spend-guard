# Current Goal: [Phase Number] — [Milestone Name]

## Goal metadata

- Feature: `[feature name]`
- Phase: `[phase number]`
- Status: `READY FOR REVIEW`
- Source plan: `[path to PRD / ROADMAP.md]`
- Previous phase report: `[path to previous report, when applicable]`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Supabase (Auth + Postgres + RLS) + Tailwind / shadcn. Tests: Vitest (jsdom) + React Testing Library; Playwright e2e.
- READ FIRST: `AGENTS.md` warns "This is NOT the Next.js you know." Read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code. Heed Next 16 / React 19 deprecations.
- Exact commands (run in CODE ROOT — the git repo, not the planning root):
    - Typecheck: `npm run typecheck`
    - Lint: `npm run lint`
    - Unit + component tests: `npm test` · single file: `npm test -- <path>` · coverage (80% gate, enforced in `vitest.config.mts`): `npm run test:coverage`
    - E2E: `npx playwright install chromium` (first run only) then `npm run e2e` (Playwright auto-starts dev on `127.0.0.1:3100`)
    - Build: `npm run build`
    - DB migrations: add SQL under `supabase/migrations/`; verify by replaying all migrations with `supabase db reset`, then confirm the schema and RLS. Ship a documented rollback SQL for any schema change.
- Frontend rule: any UI-bearing phase MUST invoke the `frontend-design` skill before writing UI, and verify the real page via Playwright (snapshot + interaction), not just `next build`.
- Git boundary (HARD): never commit, push, merge, rebase, or deploy. The user runs all git. Capture each finished phase as a patch under `tasks/mvp-completion/completed/<phase>/<phase>.patch`.

## 1. Current project state

The following work is already complete:

- [completed behavior]
- [completed service or module]
- [completed schema or migration]
- [completed tests or infrastructure]

Do not redo, replace, or redesign completed work.

Before changing code:

1. inspect the existing implementation;
2. inspect the current Git diff;
3. read the previous phase report;
4. preserve all valid completed work;
5. verify that this goal still matches the repository.

## 2. Objective

Implement:

> [One sentence describing the bounded outcome of this milestone.]

This milestone owns:

- [responsibility]
- [responsibility]
- [responsibility]

This milestone does not include:

- [next-phase responsibility]
- [related but excluded work]
- [future enhancement]

## 3. Required behavior

The implementation must:

1. [observable behavior]
2. [observable behavior]
3. [observable behavior]
4. [important edge case]
5. [compatibility requirement]
6. [deterministic or safety requirement]

## 4. Architectural invariants

The implementation must preserve:

1. The deterministic rules engine (`src/lib/calculations/**`) remains the single source of financial decisions; the LLM advisor only explains, never decides.
2. Existing formulas, Zod validation, and persistence logic are reused rather than copied.
3. Server actions check the authenticated user and derive `user_id` from Supabase Auth — never trust a client-supplied id.
4. Existing public APIs / server-action signatures stay backward-compatible unless explicitly approved.
5. New orchestration stays thin; business rules stay in the calculations / service layer.
6. Work from completed phases is not redesigned.

Stop and report when satisfying the goal would require violating one of these invariants.

## 5. Important behavioral definitions

### [Ambiguous concept]

[Define exactly what it means, citing the PRD section.]

It may:

- [allowed behavior]

It must not:

- [prohibited interpretation]
- [prohibited interpretation]

Do not invent undefined product behavior.

## 6. Existing implementation to inspect

Before editing, inspect:

- `[existing component]`
- `[existing server action / API]`
- `[existing calculation or mapper]`
- `[existing tests]`
- `[previous phase implementation]`

Document: current input/output, current callers, existing error behavior, relevant conventions, compatibility risks, and any existing partial implementation of this goal.

## 7. Allowed files

Prefer limiting changes to:

- `[path]`
- `[path]`
- `[*.test.ts / *.test.tsx]`
- `supabase/migrations/[new migration]` (when applicable)
- `tasks/mvp-completion/STATUS.md`

An additional file may be modified only when: (1) it is necessary; (2) the reason is documented before editing; (3) it does not expand milestone scope.

## 8. Forbidden files and scope

Do not modify:

- `[completed phase file]`
- `[next-phase file]`
- `[unrelated subsystem]`
- production / environment configuration;
- unrelated migrations or unrelated UI / API files.

Do not: begin the next phase; introduce a competing implementation; weaken or remove tests; bypass validation or RLS; perform unrelated refactors; commit, push, merge, rebase, deploy, or modify production data.

## 9. Preferred implementation shape

Preferred public seam:

```text
[proposed function, component, server action, route, or interface]
```

This is guidance. Follow existing repository conventions when they provide a better compatible shape.

The implementation should: reuse existing logic; minimize new public surface; isolate novel behavior into testable units; avoid speculative abstractions; remain reversible; expose an explicit seam the next phase can consume.

## 10. Required tests

At minimum, test:

1. normal successful behavior;
2. important edge cases;
3. invalid-input behavior;
4. missing-data behavior;
5. deterministic behavior (same input → same output);
6. exact ties / boundary values when relevant (e.g. risk-score thresholds);
7. failure isolation;
8. preservation of existing behavior;
9. forbidden behavior that must never occur (e.g. LLM overriding the decision);
10. the actual new public entry point (component render / server action / route).

At least one test or documented smoke check must exercise:

```text
public entry point (component / server action / route)
→ real existing dependency (calculations / Supabase mapper)
→ new behavior
→ returned or persisted result
```

Testing only pure helpers is not sufficient when a new orchestration path is introduced.

## 11. Verification commands

Focused verification:

```bash
npm test -- [focused test path]
npm run typecheck
```

Public-path or integration verification:

```bash
[component test via Testing Library, OR npm run e2e for the relevant Playwright spec]
```

Relevant regressions:

```bash
npm test
npm run lint
```

Scope and diff verification:

```bash
git diff --check
git diff --stat
git diff --name-only
git status --short
```

Update this section with the phase's exact commands before implementation. Add `npm run test:coverage`, `npm run build`, and `supabase db reset` where the phase requires them.

## 12. Claim-to-evidence matrix

| Completion claim            | Evidence                   | Status       |
| --------------------------- | -------------------------- | ------------ |
| [required behavior]         | `[test or command]`        | NOT VERIFIED |
| [edge case]                 | `[test or command]`        | NOT VERIFIED |
| Existing behavior unchanged | `[regression test]`        | NOT VERIFIED |
| Public path works           | `[component / e2e test]`   | NOT VERIFIED |
| No forbidden files changed  | `git diff --name-only`     | NOT VERIFIED |
| Diff is structurally valid  | `git diff --check`         | NOT VERIFIED |

Allowed statuses: `VERIFIED`, `PARTIALLY VERIFIED`, `NOT VERIFIED`, `BLOCKED`. Do not mark a claim `VERIFIED` without direct evidence.

## 13. Execution workflow

Before implementation: inspect the repo + current diff; determine what is already complete; document findings in `STATUS.md`; confirm the smallest coherent design; verify all planned files are allowed.

During implementation: select one coherent behavior; add/update its test; observe the expected failure when practical; implement the smallest correction; run focused verification; inspect the diff; update `STATUS.md`; continue.

Before finishing: run the public-path check; run relevant regressions + lint + coverage; complete the claim-to-evidence matrix; perform correctness / regression / simplification review; inspect the complete diff; verify changed-file scope.

## 14. Retry and stop conditions

Make no more than three materially different repair attempts for the same failure. After three failed attempts, stop and report the failing command, output, attempted repairs, root-cause hypothesis, and the human decision required.

Stop immediately when: a product decision is required; the goal conflicts with existing repository behavior; a forbidden file appears necessary; a public contract must change; a destructive migration is required; production access is required; an architectural invariant would be violated.

## 15. Definition of Done

This milestone is complete only when: every required behavior is implemented; architectural invariants are preserved; focused tests pass; the actual public path is exercised; relevant regressions + lint pass and coverage holds at ≥ 80%; deterministic behavior is demonstrated where required; no forbidden files changed; `git diff --check` passes; all completion claims have evidence; remaining risks are documented; `STATUS.md` is current; the next phase has not started.

## 16. Final report

The final report (per `tasks/templates/REPORT_TEMPLATE.md`) must include: outcome (`COMPLETE` / `PARTIAL` / `BLOCKED`); files changed; exploration findings; implementation design; behavior implemented; commands and tests executed; claim-to-evidence matrix; review findings; unresolved risks; unrelated existing failures; confirmation that forbidden and next-phase files were untouched; human-review checklist.

Do not commit, push, merge, rebase, deploy, or modify production data.
