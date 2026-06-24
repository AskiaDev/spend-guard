# Milestone Report: 12 — E2E & coverage hardening

## Report metadata

- Feature: `mvp-completion`
- Phase: `12`
- Goal: `tasks/mvp-completion/completed/12-e2e-coverage-hardening/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 12; PRD §15, §30)
- Branch: `main`
- Commit: `NOT COMMITTED` (checkpoint patch only — user commits)
- Checkpoint patch: `tasks/mvp-completion/completed/12-e2e-coverage-hardening/12-e2e-coverage-hardening.patch`
- Patch SHA-256: `00a98cf114bc1d0d6e0c9e87997f07b2885df16f80521b02cb641955bf219009`
- Base commit SHA: `9d2f4236e3d797621befe6a35707fb7efe6727aa`
- Started: `2026-06-24`
- Finished: `2026-06-24`
- Implemented by: `Claude Code`
- Reviewed by: `ecc:code-reviewer` (independent, read-only)
- Outcome: `COMPLETE`

## Outcome summary

Locked SpendGuard's six critical user journeys with Playwright e2e against the remote Supabase
and proved the auth/protected-route redirect. Added two new journeys (cooldown recheck, weekly
report) plus a dedicated unauthenticated-redirect spec, and hardened the harness (direct
`next dev` webServer to bypass portless, serial mode, generous remote-hydration timeouts,
data-independent assertions for the shared single-user account). All 8 tests pass; the 80% Vitest
coverage gate still holds (92 / 81.59 / 94.9 / 92.12); typecheck and lint are clean. Test-only
phase: no `src/` application code, server actions, or §19 engine were changed. This is the final
roadmap phase; a feature-level `FINAL_REPORT.md` accompanies this report.

## Original objective

> Lock SpendGuard's critical user journeys with Playwright e2e (against the remote) and prove the
> auth/protected-route redirect, so the MVP's flows are regression-guarded; keep Vitest coverage ≥80%.

### In scope

- New e2e journeys for the gaps: cooldown recheck and weekly report.
- New auth/protected-route redirect spec (unauthenticated → `/login`), confirming `src/proxy.ts`.
- Confirm the existing 3 journeys still pass against the remote.
- Confirm the 80% Vitest coverage gate still holds.

### Explicitly out of scope

- New app features or any §19 engine / advisor change (touch app code only on a verified defect).
- Re-testing P11 internals beyond an opportunistic disclaimer-present assertion.
- Visual/overflow specs (`spendguard-visual.spec.ts`).

## Starting repository state

Before this milestone:

- P1–P11 complete and archived under `completed/`.
- E2E harness existed (`e2e/spendguard.spec.ts`, `e2e/spendguard-visual.spec.ts`,
  `playwright.config.ts`) with a login `beforeEach` + `completePurchaseWizard` helper and three
  journeys (desktop purchase, voice review, mobile onboarding).
- Middleware `src/proxy.ts` (Next 16) + `(app)/layout.tsx` enforce auth routing.
- Vitest coverage ≥80%.

### Existing work preserved

- All P1–P11 application code, server actions, migrations, and the §19 deterministic engine are
  unchanged by this phase.
- The existing three journeys and helpers were reused, not rewritten.

## Exploration findings

### Existing execution path

Playwright `webServer` boots the Next app → tests drive the real public routes (`/login`,
`/onboarding`, `/checker`, `/voice`, `/cooldown`, `/reports`, `/settings`) → the app's
`use-financial-state` hook loads the financial workspace from the remote Supabase → server actions
persist checks/goals/cooldown rows → routing guard (`src/proxy.ts` + `(app)/layout.tsx`) gates auth.

### Existing architectural ownership

The e2e suite owns black-box journey verification; it does not own app behavior. Auth routing is
owned by `src/proxy.ts` (middleware) and the `(app)` layout guard.

### Existing public contracts

- Route URLs and the result route (`/checker/result`), the cooldown `Recheck <item>` control with
  its `role=status` "Recheck result for <item>" + trend label, and the reports "Reference insights"
  / "Next Best Action" surfaces — all asserted, none changed.
- The shared single-user remote account accumulates rows across runs; assertions must be
  existence/structure-based and `.first()`-scoped.

### Existing test conventions

- Playwright (`npm run e2e` → `playwright test`); Vitest for unit/coverage (`npm run test:coverage`,
  80% gate). E2E runs against the remote with owner creds passed inline via env.

### Risks identified before implementation

- Shared remote account state (onboarding flag, accumulating rows) can break order-dependent or
  count-based assertions.
- Cold `next dev` + remote hydration is slow (20–40s), causing false-negative timeouts.
- `npm run dev` wraps `portless`, which collides with / orphans the e2e dev server (hung runs).

## Implementation design

### Chosen approach

Black-box Playwright journeys exercising the real routes end-to-end against the remote, hardened for
the shared-account + cold-dev-server reality: serial execution, generous timeouts, hydration-skeleton
waits, data-independent assertions, and a direct `next dev` webServer.

### Reused components

- `completePurchaseWizard`, `expectNoHydrationSkeleton`, and the login `beforeEach` — reused for the
  two new journeys.
- The existing three journeys — kept, with the purchase journey's verdict assertion made
  data-independent (asserts a verdict label renders in the "Purchase summary" region rather than
  pinning a specific decision string that depends on live account finances).

### New components

- `e2e/auth-redirect.spec.ts` — unauthenticated-redirect spec (no login `beforeEach`); each
  Playwright context is clean, so the redirect is genuinely tested unauthenticated.
- Two new journeys in `e2e/spendguard.spec.ts` — cooldown recheck (trend + decision) and weekly
  report (real insights).

### Alternatives rejected

#### Point the e2e webServer at a production `next start` build (coexists with `next dev`)

- Reason rejected: adds a build step and changes the proven harness during the final finalize; the
  direct `next dev` on :3100 already isolates from portless and runs clean when no dev server is up.
- Risk avoided: introducing a new variable into an already-green run.

#### Keep the hardcoded "Wait" verdict assertion

- Reason rejected: the §19 verdict depends on the shared account's live finances; a fixed string is
  flaky and couples the test to account data.
- Risk avoided: false negatives when the account state shifts.

### Architectural invariants preserved

- Deterministic §19 engine and RLS untouched (test-only phase).
- No server action or UI component modified by this phase's patch.

## Behavior implemented

### Cooldown recheck journey

Seeds a cooldown item via the real check flow, opens `/cooldown`, clicks `Recheck <item>`, and
asserts the `role=status` "Recheck result for <item>" region renders with a trend label
(Looking better / About the same / Looking riskier / Today's check).

Evidence:

- `e2e/spendguard.spec.ts:177` — test "cooldown recheck recomputes the decision and shows a trend" — PASS.

### Weekly report journey

Opens `/reports`, generates the report when the Generate control is present, and asserts real
rule-derived insights render ("Reference insights" + "Next Best Action"), not static placeholders.

Evidence:

- `e2e/spendguard.spec.ts:207` — test "weekly report generates insights from saved data" — PASS.

### Auth/protected-route redirect

A fresh unauthenticated context hitting `/`, `/settings`, or `/cooldown` is redirected to `/login`,
and the login screen (not the protected page) renders.

Evidence:

- `e2e/auth-redirect.spec.ts:11` — 3 parametrized tests — all PASS.

### Existing journeys kept green

Onboarding→dashboard, desktop purchase→decision→Add to Goal/Cooldown, and voice review→result — all
PASS against the remote with the hardened assertions.

### Error and edge-case behavior

- Shared-account duplicates: `.first()` on article locators avoids strict-mode violations.
- Slow remote hydration: hydration-skeleton waits + per-test timeouts (60–90s) on journeys that
  mutate then reload.
- Order dependence: `test.describe.configure({ mode: "serial" })` + `--workers=1` so onboarding runs
  first against the freshly un-onboarded account and seeds state for the rest.

## Files changed

| File | Change | Purpose |
| ---- | ------ | ------- |
| `e2e/spendguard.spec.ts` | modified | Add cooldown-recheck + weekly-report journeys; data-independent purchase verdict; serial mode; both Motivation radio groups; generous timeouts |
| `e2e/auth-redirect.spec.ts` | new | Unauthenticated → `/login` redirect spec (no login beforeEach) |
| `playwright.config.ts` | modified | Direct `npx next dev --port 3100` webServer (bypass portless); `expect.timeout` 20s; `reuseExistingServer: !process.env.CI` |

### Files intentionally not changed

- `src/lib/calculations/**`, all server actions, all UI components, `src/proxy.ts`, migrations —
  preserving the deterministic engine, RLS, and prior phases. No journey surfaced a defect requiring
  an app-code change.

### Scope exceptions

None. The regenerated checkpoint patch contains exactly the three allowed files
(`git diff --name-only` on the patch shows only `e2e/auth-redirect.spec.ts`, `e2e/spendguard.spec.ts`,
`playwright.config.ts`).

## Database and migration changes

Not applicable. This phase adds no migrations and changes no schema or data. (E2E runs exercise the
existing remote schema and write per-user rows under the owner account; data loss on that
pre-deployment single-user project is acceptable per the standing directive.)

## Tests added or changed

| Test | Coverage |
| ---- | -------- |
| `e2e/spendguard.spec.ts` "cooldown recheck…" | Cooldown recheck trend + decision via the real `/cooldown` route |
| `e2e/spendguard.spec.ts` "weekly report…" | Weekly report real insights via the real `/reports` route |
| `e2e/auth-redirect.spec.ts` (×3) | Unauthenticated redirect to `/login` from `/`, `/settings`, `/cooldown` |
| `e2e/spendguard.spec.ts` (existing 3) | Onboarding, desktop purchase, voice review — kept green with hardened assertions |

### Coverage boundaries

- E2E runs against one shared, single-user remote account; cross-user isolation is proven separately
  by P11's RLS test, not re-proven here.
- `e2e/spendguard-visual.spec.ts` (16 tests) is pre-existing broken (no login) and out of scope.

## Verification results

### Focused checks

| Check | Command | Result |
| ----- | ------- | ------ |
| 6 journeys + auth (8 tests) | `E2E_… npm run e2e -- e2e/spendguard.spec.ts e2e/auth-redirect.spec.ts --workers=1 --reporter=list` | PASS — "8 passed (2.0m)" |

### Public-path or integration checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Real routes end-to-end against remote | (the e2e run above) | PASS |

### Regression checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Coverage (≥80% gate) | `npm run test:coverage` | PASS — 92 / 81.59 / 94.9 / 92.12 |
| Typecheck | `npm run typecheck` | PASS — exit 0, clean |
| Lint | `npm run lint` | PASS — 0 errors (271 pre-existing warnings) |
| Build | `npm run build` | NOT RUN — e2e webServer compiles routes on demand; covered by the green run |

### Diff and scope checks

| Check | Command | Result |
| ----- | ------ | ------ |
| Diff formatting | `git diff --check` | PASS |
| Changed files (patch) | `grep '^diff --git' …12-e2e-coverage-hardening.patch` | PASS — only the 3 allowed files |
| Working-tree status | `git status --short` | PASS — index pristine after patch regen |
| Forbidden files untouched | patch inspection | PASS — no `src/**`, server actions, migrations, or `src/proxy.ts` |

### Unrelated or environment-blocked checks

None. (The prior session's re-run was environment-blocked by the user's running dev server; this
session ran with port 3100 free and no active portless route, so the run completed and self-terminated.)

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Onboarding→dashboard journey passes | `npm run e2e` (test #4) | VERIFIED |
| Check→decision→convert-to-goal passes | `npm run e2e` (test #5) | VERIFIED |
| Voice→confirm→decision passes | `npm run e2e` (test #6) | VERIFIED |
| Cooldown recheck journey passes | `npm run e2e` (test #7) | VERIFIED |
| Weekly report journey passes | `npm run e2e` (test #8) | VERIFIED |
| Auth redirect bounces to /login | `npm run e2e` (tests #1–3) | VERIFIED |
| Middleware exists | `src/proxy.ts` present | VERIFIED |
| Coverage ≥80% | `npm run test:coverage` (92 / 81.59 / 94.9 / 92.12) | VERIFIED |
| No forbidden files changed | patch contains only the 3 allowed files | VERIFIED |
| Diff is structurally valid | `git diff --check` | VERIFIED |

## Acceptance-criteria results

- [x] **All six journeys pass against the remote** — "8 passed (2.0m)".
- [x] **Middleware confirmed** — `src/proxy.ts` present; auth-redirect tests prove it bounces.
- [x] **Coverage ≥80%** — 92 / 81.59 / 94.9 / 92.12.
- [x] **Typecheck + lint clean** — typecheck exit 0; lint 0 errors.
- [x] **No forbidden files changed** — patch limited to the 3 allowed files.
- [x] **`git diff --check` clean** — no whitespace/conflict errors.
- [x] **Matrix all VERIFIED** — see above.
- [x] **`FINAL_REPORT.md` produced** — this is the final phase.

## Independent review

### Correctness review

- Reviewer: `ecc:code-reviewer`
- Verdict: `PASS WITH FINDINGS` → overall `SAFE TO CHECKPOINT`

Findings:

- `IMPORTANT` Uncommitted P11 `src/**` files share the working tree with the P12 test files — Resolution:
  not a P12 code defect; surfaced to the user as a commit-hygiene action (stage/commit P11 app code
  separately from P12's 3 test/config files). The P12 checkpoint patch already isolates only the 3
  test files. Hard git boundary: the user commits.
- `MINOR` `auth-redirect.spec.ts:14-15` redundant `waitForURL` + `toHaveURL` — Resolution: retained
  as a deliberate, harmless assert-intent; logged as a follow-up nicety.
- `MINOR` `spendguard.spec.ts:94` `Finish Setup` `toBeEnabled` after click is a weak settle-signal —
  Resolution: retained (the dashboard card assertions are the real proof); logged as follow-up.
- `MINOR` `spendguard.spec.ts:198` `/^Recheck/` prefix regex could match a future "Rechecking…" —
  Resolution: retained (scoped to `.first()` item; click is the trigger, not mid-flight); follow-up.
- `MINOR` `spendguard.spec.ts:215` `isVisible().catch(() => false)` can swallow errors — Resolution:
  retained as a safe conditional-UI idiom; follow-up.

Rationale for not fixing the MINORs in-phase: all four are cosmetic; none lets a broken feature pass
green (reviewer confirmed the data-independent verdict assertion is meaningful). Re-editing the
just-proven-green specs would require another remote e2e run and risks introducing flake for no
correctness gain.

### Regression review

- Reviewer: `ecc:code-reviewer`
- Verdict: `PASS` — no forbidden files touched; deterministic engine, RLS, server actions, and the
  existing three journeys preserved.

### Simplification review

- Reviewer: `ecc:code-reviewer`
- Verdict: `PASS` — existing helpers reused; no speculative abstraction added.

## Repair history

The journeys were proven green in a prior session (run `b8h3fwtc7`, "8 passed"); an independent
review then returned `SAFE AFTER REQUIRED FIXES` and 3 low-risk fixes were applied (data-independent
purchase verdict assertion; `test.setTimeout(60_000)` on the weekly-report test;
`reuseExistingServer: !process.env.CI`). This session ran the confirming re-run **with those fixes in
place** — "8 passed (2.0m)" — closing the only pending verification, then a second independent review
returned `SAFE TO CHECKPOINT`. No materially-different failure cycles occurred this session.

## Deviations from the original goal

None.

## Remaining risks and limitations

- E2E requires a reset/fresh-ish single-user remote account and no other `next dev` running for the
  project (Next 16 allows one dev server per project dir). Documented in the e2e checklist memory.
- `e2e/spendguard-visual.spec.ts` (16 tests) is pre-existing broken (no login → all redirect to
  `/login`). Out of P12 scope.
- The shared remote account accumulates rows; assertions are existence-based and `.first()`-scoped to
  tolerate this.

## Follow-up work

- Revive or quarantine `e2e/spendguard-visual.spec.ts` (add a login `beforeEach`).
- Apply the 4 MINOR review nits when those specs are next touched (drop the redundant `toHaveURL`,
  drop the weak `Finish Setup` `toBeEnabled`, use an exact "Recheck" label, drop the `isVisible` catch).
- Optional: a CI-safe e2e mode that points the webServer at a `next start` build so e2e can coexist
  with a running `next dev`.

## Guidance for the next milestone

This is the final roadmap phase — there is no next milestone. See `FINAL_REPORT.md`.

The post-MVP work may rely on:

- The 6 regression-guarded journeys and the auth-redirect spec as a safety net for future changes.

It must not assume:

- That `spendguard-visual.spec.ts` is green, or that e2e runs without a fresh account + an idle dev
  server.

### Recommended next milestone

`None — MVP roadmap complete.` Reason: all 12 phases are verified and archived; see `FINAL_REPORT.md`.

## Human review checklist

- [ ] Review the complete diff (apply `12-e2e-coverage-hardening.patch`).
- [ ] Confirm changed-file scope is exactly the 3 test/config files.
- [ ] Inspect auth-redirect behavior against `src/proxy.ts` + `(app)/layout.tsx`.
- [ ] Migrations: not applicable this phase.
- [ ] Confirm public contracts (route URLs, result route, cooldown/report surfaces) unchanged.
- [ ] Confirm the e2e run was actually executed ("8 passed (2.0m)").
- [ ] Confirm report claims match evidence.
- [ ] Confirm remaining risks (visual spec, shared account) are acceptable.
- [ ] Confirm no next-phase work was started (there is none — final phase).
- [ ] **Commit hygiene**: stage/commit P11's `src/**` app code separately from P12's 3 test files.

## Git and deployment status

- Commit created by agent: `NO`
- Pushed by agent: `NO`
- Merged by agent: `NO`
- Deployed by agent: `NO`
- Production data modified: `NO` (e2e wrote per-user rows under the owner account on the pre-deployment remote — acceptable per directive; no production project exists)

## Final disposition

- Agent recommendation: `READY FOR HUMAN REVIEW`
- Human decision: `PENDING`
- Human reviewer: `pending`
- Decision date: `pending`
