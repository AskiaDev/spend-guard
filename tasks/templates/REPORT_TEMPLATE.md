# Milestone Report: [Phase Number] — [Milestone Name]

## Report metadata

- Feature: `[feature name]`
- Phase: `[phase number]`
- Goal: `[archived path to GOAL.md]`
- Source plan: `[path to PRD / ROADMAP.md]`
- Branch: `[branch name]`
- Commit: `NOT COMMITTED` (checkpoint patch only — user commits)
- Checkpoint patch: `[tasks/mvp-completion/completed/<phase>/<phase>.patch]`
- Patch SHA-256: `[hash]`
- Base commit SHA: `[sha]`
- Started: `[YYYY-MM-DD]`
- Finished: `[YYYY-MM-DD]`
- Implemented by: `[human / Claude Code / Codex]`
- Reviewed by: `[reviewer or NOT REVIEWED]`
- Outcome: `COMPLETE | PARTIAL | BLOCKED`

## Outcome summary

[Two to five sentences: what was implemented, whether the Definition of Done was met, and any important limitations.]

Do not use `COMPLETE` when: required verification was not run; a required public path was not exercised; a blocking review finding remains; a completion claim is only partially verified. Use `PARTIAL` for useful-but-unproven work; `BLOCKED` when implementation could not safely continue.

## Original objective

> [Copy the bounded objective from CURRENT_GOAL.md.]

### In scope

- [responsibility]

### Explicitly out of scope

- [next-phase responsibility]

## Starting repository state

Before this milestone:

- [completed previous behavior]
- [existing service or execution path]

### Existing work preserved

- [previous implementation preserved]

## Exploration findings

### Existing execution path

[Caller → server action → calculation/mapper → Supabase/UI flow.]

### Existing architectural ownership

[Which component owned the responsibility before this milestone.]

### Existing public contracts

[Input/output/error/ordering/persistence behavior that had to stay compatible.]

### Existing test conventions

[Applicable testing method and command in this repo.]

### Risks identified before implementation

- [risk]

## Implementation design

### Chosen approach

[Implemented design and why it fits the existing architecture.]

### Reused components

- `[component]` — [how it was reused]

### New components

- `[component]` — [responsibility]

### Alternatives rejected

#### [Alternative]

- Reason rejected: [reason]
- Risk avoided: [risk]

### Architectural invariants preserved

- [invariant]

## Behavior implemented

### [Behavior or capability]

[Observable behavior.]

Evidence:

- `[test or command]`

### Error and edge-case behavior

- [invalid-input behavior]
- [missing-data behavior]
- [deterministic-order behavior]

## Files changed

| File     | Change               | Purpose  |
| -------- | -------------------- | -------- |
| `[path]` | new/modified/deleted | [reason] |

### Files intentionally not changed

- `[path]` — [why preserving it matters]

### Scope exceptions

Use `None.` or document every changed file outside the original allowed list:

| File     | Why it became necessary | Human approval        |
| -------- | ----------------------- | --------------------- |
| `[path]` | [reason]                | approved/not approved |

## Database and migration changes

Use `Not applicable` when there are no schema/data changes.

### Migrations added

- `supabase/migrations/[file]`

### Apply verification

```bash
supabase db reset
```

Result:

```text
[result]
```

### Rollback verification

```bash
[documented rollback SQL or supabase db reset to prior migration]
```

Result:

```text
[result]
```

### Data-safety evidence

- [existing rows preserved]
- [RLS still enforces per-user isolation]
- [production data not touched]

## Tests added or changed

| Test          | Coverage           |
| ------------- | ------------------ |
| `[test path]` | [behavior covered] |

### Coverage boundaries

- [uncovered integration path]
- [environment-dependent path]

Do not describe a path as verified when only its helpers were tested.

## Verification results

### Focused checks

| Check   | Command              | Result            |
| ------- | -------------------- | ----------------- |
| [check] | `npm test -- [path]` | PASS/FAIL/BLOCKED |

### Public-path or integration checks

| Check   | Command                     | Result            |
| ------- | --------------------------- | ----------------- |
| [check] | `[component / e2e command]` | PASS/FAIL/BLOCKED |

### Regression checks

| Check        | Command                 | Result            |
| ------------ | ----------------------- | ----------------- |
| Full suite   | `npm test`              | PASS/FAIL/BLOCKED |
| Lint         | `npm run lint`          | PASS/FAIL/BLOCKED |
| Typecheck    | `npm run typecheck`     | PASS/FAIL/BLOCKED |
| Coverage     | `npm run test:coverage` | PASS/FAIL/BLOCKED |
| Build        | `npm run build`         | PASS/FAIL/BLOCKED |

### Diff and scope checks

| Check                     | Command                | Result    |
| ------------------------- | ---------------------- | --------- |
| Diff formatting           | `git diff --check`     | PASS/FAIL |
| Changed files             | `git diff --name-only` | PASS/FAIL |
| Working-tree status       | `git status --short`   | PASS/FAIL |
| Forbidden files untouched | `[inspection]`         | PASS/FAIL |

### Unrelated or environment-blocked checks

Use `None.` or a table of `BLOCKED` checks with the exact reason and impact. Do not write "all tests passed" when a check failed or was blocked.

## Claim-to-evidence matrix

| Completion claim            | Evidence                 | Status   |
| --------------------------- | ------------------------ | -------- |
| [required behavior]         | `[test or command]`      | VERIFIED |
| [edge case]                 | `[test or command]`      | VERIFIED |
| Existing behavior unchanged | `[regression evidence]`  | VERIFIED |
| Public entry point works    | `[integration evidence]` | VERIFIED |
| No forbidden files changed  | `git diff --name-only`   | VERIFIED |
| Diff is structurally valid  | `git diff --check`       | VERIFIED |

Every status must agree with the evidence elsewhere in this report.

## Acceptance-criteria results

Copy each acceptance criterion from `CURRENT_GOAL.md`.

- [x] **[Criterion]** — [implementation and evidence]
- [ ] **[Criterion]** — [reason incomplete or blocked]

An unchecked required criterion means the outcome cannot be `COMPLETE`.

## Independent review

### Correctness review

- Reviewer: `[agent or human]`
- Verdict: `PASS | PASS WITH FINDINGS | FAIL`

Findings:

- `[severity]` [finding] — Resolution: [fix or reason retained]

### Regression review

- Reviewer: `[agent or human]`
- Verdict: `PASS | PASS WITH FINDINGS | FAIL`

### Simplification review

- Reviewer: `[agent or human]`
- Verdict: `PASS | PASS WITH FINDINGS | FAIL`

Severity: `BLOCKING`, `IMPORTANT`, `MINOR`, `SUGGESTION`. A milestone cannot be `COMPLETE` with an unresolved blocking finding.

## Repair history

Use `No significant repair cycles.` or document each meaningful failed cycle (failing command, root cause, attempts, correction, final result).

## Deviations from the original goal

Use `None.` or document each deviation (original expectation, actual implementation, reason, approval, effect on future phases).

## Remaining risks and limitations

- [known limitation]
- [coverage boundary]
- [assumption future phases must respect]

## Follow-up work

- [follow-up]

Do not silently implement follow-up work inside this milestone.

## Guidance for the next milestone

The next milestone may rely on:

- `[public seam / new server action / verified behavior]`

The next milestone must not assume:

- [unimplemented / untested behavior]

### Recommended next milestone

`[Phase number — milestone name]` — Reason: [why this is the correct next bounded step.]

## Human review checklist

- [ ] Review the complete diff (apply the checkpoint patch)
- [ ] Confirm changed-file scope
- [ ] Inspect security-sensitive behavior (auth, RLS, server actions)
- [ ] Inspect migrations and rollback, when applicable
- [ ] Confirm public contracts remain compatible
- [ ] Confirm all required tests were actually executed
- [ ] Confirm report claims match evidence
- [ ] Confirm remaining risks are acceptable
- [ ] Confirm no next-phase work was started

## Git and deployment status

- Commit created by agent: `NO`
- Pushed by agent: `NO`
- Merged by agent: `NO`
- Deployed by agent: `NO`
- Production data modified: `NO`

## Final disposition

- Agent recommendation: `READY FOR HUMAN REVIEW | NOT READY | BLOCKED`
- Human decision: `PENDING | ACCEPTED | REJECTED | ACCEPTED WITH FOLLOW-UP`
- Human reviewer: `[name or pending]`
- Decision date: `[date or pending]`
