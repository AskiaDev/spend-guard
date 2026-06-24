# Milestone Status: 12 — E2E & coverage hardening

## Metadata

- Feature: `mvp-completion`
- Phase: `12`
- Goal: `tasks/mvp-completion/completed/12-e2e-coverage-hardening/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 12; PRD §15, §30)
- Branch: `main`
- State: `COMPLETE` (archived)
- Last updated: `2026-06-24`
- Updated by: `Claude Code`

## Current objective

Lock the 6 critical journeys with Playwright e2e against the remote + prove auth/protected-route
redirect; keep coverage ≥80%. Final roadmap phase. — DONE.

## Outcome

`COMPLETE`. The confirming e2e re-run (with the 3 prior review fixes in place) passed — "8 passed
(2.0m)" — in this session, closing the only pending verification. A second independent review
returned `SAFE TO CHECKPOINT`. Phase report, feature-level `FINAL_REPORT.md`, and the regenerated
checkpoint patch are written; archived under `completed/12-e2e-coverage-hardening/`.

## Completed in this milestone

- `e2e/auth-redirect.spec.ts` (NEW) — 3 unauthenticated-redirect tests (PASS).
- `e2e/spendguard.spec.ts` — added cooldown-recheck + weekly-report journeys; onboarding-first serial
  order; data-independent purchase verdict assertion; both Motivation radio groups answered; generous
  remote-hydration timeouts.
- `playwright.config.ts` — webServer runs `npx next dev --port 3100` directly (bypasses portless →
  fixes hang + dev-server collision); `expect.timeout` 20s; `reuseExistingServer: !process.env.CI`.
- Middleware confirmed present: `src/proxy.ts` (Next 16) + `(app)/layout.tsx`.
- No `src/` (app) code changed — test/config only.

## Verification status

| Check | Command | Result | Evidence |
| ----- | ------- | ------ | -------- |
| All 8 journeys + auth (post-fix) | `npm run e2e -- spendguard.spec.ts auth-redirect.spec.ts --workers=1 --reporter=list` | PASS | this session: "8 passed (2.0m)" |
| Coverage (≥80%) | `npm run test:coverage` | PASS | 92 / 81.59 / 94.9 / 92.12 |
| Typecheck | `npm run typecheck` | PASS | exit 0, clean |
| Lint | `npm run lint` | PASS | 0 errors (271 pre-existing warnings) |
| Middleware exists | `src/proxy.ts` | PASS | present |
| No forbidden files changed | patch file list | PASS | only the 3 allowed test/config files |

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Onboarding→dashboard journey passes | e2e test #4 | VERIFIED |
| Check→decision→convert-to-goal passes | e2e test #5 | VERIFIED |
| Voice→confirm→decision passes | e2e test #6 | VERIFIED |
| Cooldown recheck journey passes | e2e test #7 | VERIFIED |
| Weekly report journey passes | e2e test #8 | VERIFIED |
| Auth redirect bounces to /login | e2e tests #1–3 | VERIFIED |
| Middleware exists | `src/proxy.ts` present | VERIFIED |
| Coverage ≥80% | `npm run test:coverage` | VERIFIED |
| No forbidden files changed | patch contains only the 3 allowed files | VERIFIED |

## Independent review

- First pass (prior session): `ecc:code-reviewer` — `SAFE AFTER REQUIRED FIXES` (3 important → applied).
- Confirming pass (this session): `ecc:code-reviewer` — `SAFE TO CHECKPOINT` (0 blocking; 1 important
  = commit-hygiene note for the user re: uncommitted P11 `src/**`; 4 minor cosmetic → logged as
  follow-ups).

## Checkpoint

- Patch: `completed/12-e2e-coverage-hardening/12-e2e-coverage-hardening.patch` (regenerated with the 3
  review fixes).
- SHA-256: `00a98cf114bc1d0d6e0c9e87997f07b2885df16f80521b02cb641955bf219009`
- Base commit: `9d2f4236e3d797621befe6a35707fb7efe6727aa`
- Files: `e2e/auth-redirect.spec.ts`, `e2e/spendguard.spec.ts`, `playwright.config.ts`.

## Remaining risks

- `e2e/spendguard-visual.spec.ts` (16 tests) is PRE-EXISTING broken (no login → all redirect to
  /login). Out of P12 scope; documented follow-up.
- E2E journeys require a reset account + no other `next dev` running for the project.
- P11 and P12 are uncommitted — the user commits them separately (hard git boundary).

## Scope confirmation

- [x] No app-logic/§19 changes (test + config only)
- [x] No commit/push/merge/rebase/deploy

## Human review readiness

- State: `READY WITH KNOWN RISKS` — journeys proven green, independently reviewed, archived. See
  `FINAL_REPORT.md` for the feature-level disposition and the human review checklist.
