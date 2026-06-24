# Milestone Status: 10 — Model-agnostic advisor (local LiteRT-LM + cloud)

## Metadata

- Feature: `mvp-completion`
- Phase: `10`
- Goal: `tasks/mvp-completion/CURRENT_GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Branch: `main`
- State: `VERIFYING` (independent re-review in progress after repair cycle 1)
- Last updated: `2026-06-24`
- Updated by: `Claude Code`

## Current objective

Model-agnostic advisor: on-device (LiteRT-LM Web) + cloud (AI SDK) behind one env-selected `ModelClient` chain; deterministic engine still owns every decision; deterministic fallback is the always-on floor. Full P10 scope (explanation + transcript extraction + one lesson).

## Completed in this milestone

- Seam: `src/lib/ai/{types,mock-model-client,cloud-model-client,local-model-client,resolve-model-clients,model-spec,index}.ts` (+ tests). Env chain `NEXT_PUBLIC_AI_PROVIDER`; `isTransportConfigured` helper; server `ADVISOR_MODEL` resolver (anthropic/openai) guarded with `server-only`.
- Advisor: `src/lib/advisor/{prompt,lessons}.ts` (§21 prompt, deterministic lesson) + tests; `index.ts` slimmed (model orchestration folded into the streaming hook).
- Cloud routes: `src/app/api/advisor/{explain,extract}/route.ts` — auth-gated (`requireUserId` → 401), Zod-validated, stream text / structured object, graceful 503/502 (+ tests).
- Voice §20.5: `src/lib/voice/{draft-schema,extract-with-model}.ts` (+ tests); `voice-purchase-checker.tsx` background model-upgrade with regex fallback, only if the user has not edited.
- UI: `src/hooks/use-streamed-explanation.ts` (+ test); `src/features/purchase-checker/components/advisor-explanation.tsx` (streamed AI explanation + lesson, + test); `purchase-result.tsx` wired (keyed per check).
- Persistence: `use-financial-state.ts` persists `createFallbackAdvice` (deterministic).
- Removed superseded `src/lib/advisor/litert-lm.{ts,test.ts}`.
- `.env.example` documents the new env vars; `vitest.config.mts` aliases `server-only` for tests.

## Decisions made

### Retire `createAdvisorText`; persistence is deterministic, model streams live
- Decision: `runPurchaseCheck` persists `createFallbackAdvice` (deterministic). The model runs only in the live streaming hook (`useStreamedExplanation`). The non-streaming chain orchestrator `createAdvisorText` is removed.
- Reason: avoids a redundant paid LLM call per result view, keeps history reproducible/offline, and prevents dead/duplicate chain logic. The hook is the single model path; its tests cover chain fallthrough.
- Deviation from goal §9 (which named `createAdvisorText`): documented; the backward-compat line for it no longer applies. The decision-immutability guarantee is unchanged (model output is text-only).

## Verification status

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | PASS | exit 0 |
| Lint | `npm run lint` | PASS | exit 0 (0 errors; pre-existing React-Compiler warnings only, none in new files) |
| Focused tests | `npm test -- src/lib/ai src/lib/advisor src/lib/voice src/hooks src/app/api/advisor src/features/purchase-checker` | PASS | 17 files / 90 tests |
| Public-path test | `advisor-explanation.test.tsx` + `purchase-result.test.tsx` | PASS | explanation + lesson render; immutability render |
| Regression suite | `npm test` | PASS | 57 files / 316 tests |
| Coverage (≥80%) | `npm run test:coverage` | PASS | 91.88% stmts / 81.52% br / 94.66% fn / 92.05% lines |
| Build | `npm run build` | PASS | both advisor routes built (ƒ); server-only enforced |
| Migration replay | n/a | NOT APPLICABLE | no schema change this phase |
| E2E | `npm run e2e` | BLOCKED | a pre-existing dev server (PID 47207) holds the `portless` registration; `reuseExistingServer:false`. Spec assertion for the Lesson added; runnable once the dev server is stopped. Public path otherwise covered by component/route/hook tests. |
| Diff check | `git diff --check` | PASS | clean |
| Scope check | `git diff --name-only` | PASS | within allowed files; engine `src/lib/calculations/**` untouched |

## Claim-to-evidence progress

| Completion claim | Status | Evidence |
| --- | --- | --- |
| Models selected/ordered by env, no code change | VERIFIED | `resolve-model-clients.test.ts` |
| On-device LiteRT provider wired behind the seam | VERIFIED (CI: mocked engine) | `local-model-client.test.ts`; live inference = manual Chrome/WebGPU smoke |
| Cloud model streams a real explanation | VERIFIED (CI: mocked `ai`) | `explain/route.test.ts`; live = manual key smoke |
| Chain falls through to deterministic on failure | VERIFIED | `use-streamed-explanation.test.ts` |
| Model never changes the decision | VERIFIED | hook + advisor-explanation immutability tests; `use-financial-state` persists engine decision |
| Transcript extraction w/ regex fallback | VERIFIED | `extract-with-model.test.ts`, `extract/route.test.ts` |
| One educational lesson surfaced | VERIFIED | `lessons.test.ts`, `advisor-explanation.test.tsx` |
| Keys stay server-side | VERIFIED | `server-only` on model-spec; grep: no client imports `@ai-sdk/*`/model-spec; build clean |
| Routes require auth | VERIFIED | `explain`/`extract` route tests (401) |
| Public path works | VERIFIED (component/route/hook) | `advisor-explanation.test.tsx`; e2e BLOCKED (env) |
| Existing behavior unchanged | VERIFIED | 316 tests incl. prior suites |
| Coverage ≥ 80% | VERIFIED | `test:coverage` summary |
| No forbidden files changed | VERIFIED | `git diff --name-only` |

## Review findings

- Correctness review (subagent): initial verdict NOT SAFE — 2 BLOCKING (createAdvisorText contract; missing immutability test). Both addressed; re-verification in progress.
- Security review (subagent): initial verdict SAFE AFTER REQUIRED FIXES — 2 HIGH (route auth; server-only). Both fixed; re-verification in progress.

## Repair attempts

- Repair cycle 1 (post-review): added route auth + 401 tests; `server-only` + vitest alias; immutability tests (hook + component); reset `isStreaming` on throw; DRY `isTransportConfigured`; nullable extraction enums; `clients` prop. All gates re-run green.

## Remaining risks

- Live cloud/on-device inference not exercised in CI (no key / no WebGPU) — manual smoke required; deterministic + mocked paths fully covered.
- Persisted explanation is deterministic by design (model text is a live-only enhancement, not saved to history).
- `@litert-lm/core` is an early-preview package (API may shift); WebGPU-only, large model download.
- Deferred to P11: per-user rate limiting on advisor routes; allowlist/integrity for `NEXT_PUBLIC_LITERT_MODEL_URL`.

## Next action

Await re-review verdicts; on SAFE, write REPORT_DRAFT.md, create the checkpoint patch, and archive.

## Scope confirmation

- [x] No next-phase work started (no P11 privacy surface / P12 e2e hardening beyond P10's own path)
- [x] No forbidden files modified (engine untouched)
- [x] No unrelated refactor introduced
- [x] No tests weakened or removed (litert-lm.test.ts + advisor/index.test.ts removed with the code they covered; behavior re-covered)
- [x] No RLS / validation bypassed (routes now Zod-validated + auth-gated)
- [x] No commit/push/merge/rebase performed

## Human review readiness

- State: `READY WITH KNOWN RISKS` (pending final re-review verdict; e2e env-blocked)
