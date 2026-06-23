# Milestone Status: [Phase Number] — [Milestone Name]

## Metadata

- Feature: `[feature name]`
- Phase: `[phase number]`
- Goal: `[path to CURRENT_GOAL.md]`
- Source plan: `[path to PRD / ROADMAP.md]`
- Branch: `[branch name]`
- State: `READY FOR REVIEW`
- Last updated: `[YYYY-MM-DD HH:MM]`
- Updated by: `[human / Claude Code / Codex]`

## Allowed states

Use exactly one:

- `READY FOR REVIEW` — goal generated, not yet approved
- `READY TO START` — goal approved; implementation not started
- `INVESTIGATING` — repository inspection in progress
- `IN PROGRESS` — implementation active
- `VERIFYING` — implementation complete; checks running
- `NEEDS HUMAN DECISION` — cannot safely continue without input
- `BLOCKED` — technical/environmental blocker
- `READY FOR HUMAN REVIEW` — implementation + agent verification complete
- `COMPLETE` — human reviewed and accepted

Do not mark `COMPLETE` based only on the agent's own review.

## Current objective

[One or two sentences describing the bounded milestone objective.]

## Current step

[The exact coherent unit currently being investigated, implemented, or verified.]

## Completed prior phases

- [Phase already completed]

Do not list partially implemented work.

## Investigation findings

Record only findings that affect implementation decisions.

- [Existing execution path]
- [Current server action / calculation seam]
- [Important architectural boundary]
- [Relevant test convention]
- [Compatibility or regression risk]

## Completed in this milestone

- [Completed behavior]
- [Completed test]
- [Completed helper or public seam]

Each item must exist in the current working tree.

## In progress

- [Current implementation item]

Keep this small — normally one or two active items.

## Remaining work

- [ ] [Remaining implementation item]
- [ ] [Required edge-case test]
- [ ] [Public-path / component / e2e verification]
- [ ] [Regression + lint + coverage]
- [ ] [Independent review]
- [ ] [Human diff review]

Keep items aligned with `CURRENT_GOAL.md`. Do not add next-phase work.

## Files changed

| File     | Status               | Purpose             |
| -------- | -------------------- | ------------------- |
| `[path]` | modified/new/deleted | [reason for change] |

Any file outside the goal's allowed list needs a written justification.

## Decisions made

### [Decision title]

- Decision: [what was chosen]
- Reason: [repository evidence or PRD requirement]
- Alternatives rejected:
    - [alternative and why]
- Impact on future phases: [none or explanation]

## Verification status

| Check             | Command                       | Result  | Evidence |
| ----------------- | ----------------------------- | ------- | -------- |
| Typecheck         | `npm run typecheck`           | NOT RUN | —        |
| Lint              | `npm run lint`                | NOT RUN | —        |
| Focused test      | `npm test -- [path]`          | NOT RUN | —        |
| Public-path test  | `[component / e2e command]`   | NOT RUN | —        |
| Regression suite  | `npm test`                    | NOT RUN | —        |
| Coverage (≥80%)   | `npm run test:coverage`       | NOT RUN | —        |
| Migration replay  | `supabase db reset`           | NOT RUN | —        |
| Diff check        | `git diff --check`            | NOT RUN | —        |
| Scope check       | `git diff --name-only`        | NOT RUN | —        |

Result values: `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, `NOT APPLICABLE`. Do not write `PASS` unless the command ran with exit code zero. Mark unrelated/environment failures `BLOCKED` with the reason in evidence.

## Claim-to-evidence progress

| Completion claim            | Status       | Evidence |
| --------------------------- | ------------ | -------- |
| [Required behavior]         | NOT VERIFIED | —        |
| [Edge case]                 | NOT VERIFIED | —        |
| Existing behavior unchanged | NOT VERIFIED | —        |
| Public entry point works    | NOT VERIFIED | —        |
| No forbidden files changed  | NOT VERIFIED | —        |

Allowed statuses: `VERIFIED`, `PARTIALLY VERIFIED`, `NOT VERIFIED`, `BLOCKED`. Do not mark `VERIFIED` from code inspection alone when executable evidence is required.

## Review findings

### Correctness review

- State: `NOT RUN`
- Findings:
    - [finding]

### Regression review

- State: `NOT RUN`
- Findings:
    - [finding]

### Simplification review

- State: `NOT RUN`
- Findings:
    - [finding]

Review states: `NOT RUN`, `PASS`, `PASS WITH FINDINGS`, `FAIL`. Finding severity: `BLOCKING`, `IMPORTANT`, `MINOR`, `SUGGESTION`.

## Repair attempts

Use only when verification fails.

### Failure: [short description]

- Failing command: `[command]`
- Attempt count: `[1–3]`
- Relevant error: `[concise error]`
- Root-cause hypothesis: [diagnosis]
- Repairs attempted:
    1. [repair]

After three materially different failed attempts, set state to `NEEDS HUMAN DECISION` or `BLOCKED`.

## Blockers and open questions

### [Blocker or question]

- Type: `PRODUCT DECISION | ARCHITECTURE | ENVIRONMENT | DATA | SECURITY | OTHER`
- Impact: [what cannot proceed]
- Evidence: [file, command, or finding]
- Decision required: [specific human answer needed]

Use `None.` when no blockers exist.

## Remaining risks

- [Risk that remains even if tests pass]
- [Assumption inherited from existing code]
- [Coverage limitation]
- [Follow-up that belongs outside this milestone]

## Next action

Give one precise instruction for the next agent or human. Avoid vague "continue implementation."

## Scope confirmation

- [ ] No next-phase work started
- [ ] No forbidden files modified
- [ ] No unrelated refactor introduced
- [ ] No tests weakened or removed
- [ ] No RLS / validation bypassed
- [ ] No commit, push, merge, rebase, or deployment performed

## Human review readiness

- State: `NOT READY`

Use `NOT READY`, `READY WITH KNOWN RISKS`, or `READY`. Mark `READY` only when verification passed, the public path was exercised, claim-to-evidence entries are supported, blocking findings are resolved, changed-file scope was reviewed, and remaining risks are documented.

## Session handoff

For the next session: (1) read `CURRENT_GOAL.md`; (2) read this `STATUS.md`; (3) inspect the current Git diff; (4) preserve completed work; (5) resume from `Next action`; (6) do not repeat completed work; (7) do not begin the next milestone.
