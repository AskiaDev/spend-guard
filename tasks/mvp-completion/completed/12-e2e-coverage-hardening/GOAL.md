# Current Goal: 12 — E2E & coverage hardening

## Goal metadata

- Feature: `mvp-completion`
- Phase: `12`
- Status: `READY TO START`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 12; PRD §15, §30)
- Previous phase report: `tasks/mvp-completion/completed/11-privacy-safety-surface/REPORT.md`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router; middleware = `src/proxy.ts`) + React 19 + TS + Supabase + Tailwind. Tests: Vitest (jsdom) + Playwright e2e.
- E2E runs against the **remote** project (`.env` → `dknftjlcimtfmasrunbj.supabase.co`). Playwright auto-starts dev on `127.0.0.1:3100`.
- **Standing user directive**: the remote is pre-deployment, single-user (owner), data loss acceptable — run e2e against it freely with the owner creds (passed inline as `E2E_SUPABASE_EMAIL`/`E2E_SUPABASE_PASSWORD`; never persisted to a file).
- Commands: `npm run e2e` · `npm run e2e -- <spec>` · `npm run test:coverage` (80% gate) · `npm run typecheck` · `npm run lint` · `npm run build`.
- Git boundary (HARD): never commit/push/merge/rebase/deploy. Capture the phase as a patch under `completed/12-e2e-coverage-hardening/`.

## 1. Current project state

P1–P11 complete (archived). E2E harness exists (`e2e/spendguard.spec.ts`, `e2e/spendguard-visual.spec.ts`, `playwright.config.ts`) with a login `beforeEach` + `completePurchaseWizard` helper. Existing journeys: desktop purchase→decision→Add to Goal/Cooldown, voice review→result, mobile onboarding→dashboard. Middleware `src/proxy.ts` enforces auth routing; `(app)/layout.tsx` also redirects unauthenticated users to `/login`. Vitest coverage ≥80% (P11: stmts 92 / branch 81.6 / func 94.9 / lines 92.1).

Do not redo completed work. Inspect existing specs + the current diff first.

## 2. Objective

> Lock SpendGuard's critical user journeys with Playwright e2e (against the remote) and prove the auth/protected-route redirect, so the MVP's flows are regression-guarded; keep Vitest coverage ≥80%.

This milestone owns:

- New e2e journeys for the gaps: **cooldown recheck** and **weekly report**.
- A new **auth/protected-route redirect** test (unauthenticated → `/login`), confirming `src/proxy.ts` middleware exists and bounces.
- Confirming the existing 3 journeys still pass against the remote.
- Confirming the 80% Vitest coverage gate still holds.

This milestone does NOT include:

- New app features or any §19 engine / advisor change (test-only phase; touch app code only if a real defect blocks a journey, and say so).
- Re-testing P11 internals beyond opportunistically asserting the disclaimer is present on a visited screen.
- Visual/overflow specs (already covered by `spendguard-visual.spec.ts`).

## 3. Required behavior (journeys that must pass)

1. Onboarding → dashboard (exists) — keep green.
2. Manual check → decision → convert-to-goal (exists: Add to Goal/Cooldown) — keep green.
3. Voice check → confirm → decision (exists) — keep green.
4. **Cooldown recheck (new)**: wizard → Add to Cooldown → `/cooldown` → click `Recheck <item>` → a recheck result (`role=status`, "Recheck result for <item>") with a trend label + decision badge appears.
5. **Weekly report (new)**: `/reports` → `Generate Report` → the weekly report renders with real insights (health score + reference insights incl. "Next Best Action").
6. **Auth redirect (new)**: an unauthenticated context hitting a protected route (`/settings`) is redirected to `/login`.

## 4. Architectural invariants

1. Test-only phase: no changes to `src/lib/calculations/**`, server actions, or UI unless a verified defect blocks a journey (then documented).
2. Reuse the existing e2e helpers (`completePurchaseWizard`, `expectNoHydrationSkeleton`, login `beforeEach`).
3. Auth-redirect test must run WITHOUT the login `beforeEach` (separate spec file).
4. Deterministic engine + RLS unchanged.

## 5. Important behavioral definitions

### Auth/protected-route redirect

An unauthenticated browser context requesting a protected route must land on `/login` (enforced by `src/proxy.ts` + `(app)/layout.tsx`). The test asserts the final URL is `/login` (optionally with a redirect/next param), not the protected page.

### Cooldown "recheck"

Recomputes the decision for a paused item against the current snapshot and shows a trend ("Looking better" / "About the same" / "Looking riskier" / "Today's check") + the current decision. Display-only; it does not mutate the engine.

## 6. Existing implementation to inspect

- `e2e/spendguard.spec.ts` (login beforeEach, `completePurchaseWizard`, existing journeys).
- `playwright.config.ts` (webServer on 3100; `reuseExistingServer:false`).
- `src/features/cooldown/components/cooldown-panel.tsx` (`Recheck <item>` button; `role=status` "Recheck result for <item>"; trend labels).
- `src/features/reports/components/reports-panel.tsx` (`Generate Report`; `weekly-report-heading`; "Reference insights" / "Next Best Action").
- `src/proxy.ts` (matcher + auth routing) and `(app)/layout.tsx` (redirect guard).

## 7. Allowed files

- `e2e/spendguard.spec.ts` (add cooldown-recheck + weekly-report journeys)
- `e2e/auth-redirect.spec.ts` (new — unauthenticated redirect, no login beforeEach)
- `tasks/mvp-completion/STATUS.md`

An additional file may be modified only if a verified defect blocks a journey — documented before editing.

## 8. Forbidden files and scope

Do not modify: `src/lib/calculations/**`, server actions, UI components, `src/proxy.ts`, migrations, or any P1–P11 archived work — unless a journey surfaces a real defect (then stop, document, and treat as a scoped fix). Do not weaken assertions to force green. No commit/push/merge/rebase/deploy.

## 9. Preferred implementation shape

```text
e2e/spendguard.spec.ts:
  test("cooldown recheck recomputes the decision and shows a trend", …)
  test("weekly report generates insights from saved data", …)
e2e/auth-redirect.spec.ts:
  test("unauthenticated user is redirected from a protected route to /login", …)  // no login beforeEach
```

Reuse helpers; existence-based assertions (not brittle counts, since the shared account accumulates data).

## 10. Required tests / journeys

The six journeys in §3. Each new journey must exercise the real public route end-to-end against the remote. Auth-redirect must use a fresh unauthenticated context.

## 11. Verification commands

```bash
# full e2e against remote (creds inline; not persisted)
E2E_SUPABASE_EMAIL=… E2E_SUPABASE_PASSWORD=… npm run e2e
npm run test:coverage      # ≥80% gate still holds
npm run typecheck && npm run lint
git diff --check && git diff --name-only && git status --short
```

## 12. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Onboarding→dashboard journey passes | `npm run e2e` (existing test) | NOT VERIFIED |
| Check→decision→convert-to-goal passes | `npm run e2e` (existing test) | NOT VERIFIED |
| Voice→confirm→decision passes | `npm run e2e` (existing test) | NOT VERIFIED |
| Cooldown recheck journey passes | `npm run e2e` (new test) | NOT VERIFIED |
| Weekly report journey passes | `npm run e2e` (new test) | NOT VERIFIED |
| Auth redirect bounces to /login | `npm run e2e` (new test) | NOT VERIFIED |
| Middleware exists | `src/proxy.ts` present | VERIFIED |
| Coverage ≥80% | `npm run test:coverage` | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |

## 13. Execution workflow

Inspect specs + components → write the new journeys with real selectors → run the full e2e against the remote → repair flakes/selector drift (≤3 attempts/failure) → coverage + typecheck + lint → independent review → report → patch → archive.

## 14. Retry and stop conditions

≤3 materially different repair attempts per failing journey. Stop and report if: a journey reveals a real app defect requiring out-of-scope changes; e2e cannot reach the remote (config/auth); or flakiness can't be stabilized in 3 attempts. Distinguish a real product bug from a test-selector issue before touching app code.

## 15. Definition of Done

All six journeys pass against the remote; middleware confirmed; coverage ≥80%; typecheck + lint clean; no forbidden files changed (unless a documented defect fix); `git diff --check` clean; matrix all `VERIFIED`; `STATUS.md` current. This is the final roadmap phase → also produce `FINAL_REPORT.md`.

## 16. Final report

Phase report per `tasks/templates/REPORT_TEMPLATE.md`, plus the feature-level `FINAL_REPORT.md` (Step 11). Do not commit/push/merge/rebase/deploy.
