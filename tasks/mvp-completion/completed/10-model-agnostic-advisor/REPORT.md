# Milestone Report: 10 — Model-agnostic advisor (local LiteRT-LM + cloud)

## Report metadata

- Feature: `mvp-completion`
- Phase: `10`
- Goal: `tasks/mvp-completion/completed/10-model-agnostic-advisor/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (P10 — §11.8, §20.5, §21)
- Branch: `main`
- Commit: `NOT COMMITTED` (checkpoint patch only — user commits)
- Checkpoint patch: `tasks/mvp-completion/completed/10-model-agnostic-advisor/10-model-agnostic-advisor.patch`
- Patch SHA-256: `abc0160efa3895365e4bf4fadfe2140866d76c22013c7ac4c9881710bfa66884`
- Base commit SHA: `2ade5082ab0571346ebded567291f71263e68781`
- Started: `2026-06-24`
- Finished: `2026-06-24`
- Implemented by: `Claude Code`
- Reviewed by: `ecc:code-reviewer (correctness) + ecc:security-reviewer (security)`
- Outcome: `COMPLETE`

## Outcome summary

The purchase advisor is now model-agnostic: a generic text-only `ModelClient` seam with an env-ordered chain (on-device LiteRT-LM Web, cloud via the Vercel AI SDK behind auth-gated Next route handlers, and a deterministic floor). Swapping or reordering models is configuration only. The deterministic rules engine remains the sole source of every decision; the model only produces explanatory prose and a reviewable extraction draft. Full P10 scope landed: a §21 prompt builder, a streamed result-card explanation, §20.5 transcript→fields extraction with the regex parser as fallback, and one deterministic educational lesson. Verified by 316 passing tests (92% stmts / 81.5% branches), clean typecheck/lint, and a green production build. Two known boundaries: live cloud/on-device inference is manual-smoke only (no key / no WebGPU in CI), and the e2e run is environment-blocked by a pre-existing dev server.

## Original objective

> A model-agnostic advisor where on-device (LiteRT-LM Web) and cloud (AI SDK) models plug in behind one ordered `ModelClient` chain selected by env, powering a streamed purchase explanation and voice transcript→fields extraction, with the deterministic engine still owning every decision and a deterministic fallback whenever no model is available.

### In scope
- Generic `ModelClient` seam + env chain; real cloud + on-device providers; mock.
- §21 prompt builder; streamed explanation; §20.5 extraction (model + regex fallback); one lesson.

### Explicitly out of scope
- P11 privacy surface (disclaimer, voice-privacy note, delete-data, RLS denial test).
- P12 e2e/coverage hardening beyond P10's own path.
- Any change to §19 formulas/thresholds.

## Exploration findings

### Existing execution path
`runPurchaseCheck` (`use-financial-state.ts`) → `calculatePurchaseDecision` (engine) → persists a `PurchaseCheck` with `advisorText`. The advisor seam was `createAdvisorText` → LiteRT `window` stub → `createFallbackAdvice`. Voice: `extractPurchaseFromTranscript` (regex). Advisor UI: a static paragraph in `purchase-result.tsx`.

### Existing architectural ownership
The deterministic engine (`src/lib/calculations/**`) owns decisions; the advisor only renders prose. `PurchaseCheck` carries the full result + purchase data.

### Existing public contracts
`PurchaseDecisionResult`, `PurchaseInput`, `VoicePurchaseDraft`. `createAdvisorText(result, purchase): Promise<string>` (now retired — see Deviations).

### Existing test conventions
Vitest (globals, jsdom), RTL, 80% coverage gate, `server-only` aliased for tests.

### Risks identified before implementation
On-device LiteRT is WebGPU-only + early-preview + large download → not CI-verifiable; cloud needs a server route + key isolation.

## Implementation design

### Chosen approach
A text-only `ModelClient` interface (`generateText` / optional `streamText`), an env-ordered chain (`NEXT_PUBLIC_AI_PROVIDER`), and three transports: `MockModelClient`, `CloudModelClient` (browser `fetch` → route handlers; never imports the SDK), `LocalModelClient` (lazy WebGPU-gated `@litert-lm/core`). Server `ADVISOR_MODEL` (`"<provider>:<modelId>"`) resolves the cloud model in `model-spec.ts` (`server-only`). Structured extraction is a separate concern (dedicated route + Zod schema) because a schema cannot cross the network. The streaming hook is the single model path for the UI; persistence stores the deterministic narrative.

### Reused components
- `createFallbackAdvice` (P9) — the always-on floor and the persisted explanation.
- `evaluatePurchase` / `PurchaseDecisionResult` — untouched; the model explains its output.
- `extractPurchaseFromTranscript` — the extraction fallback.
- `requireUserId` (`src/lib/supabase/server.ts`) — route auth.

### New components
- `src/lib/ai/**` — the seam, transports, env resolver, server model resolver.
- `src/lib/advisor/{prompt,lessons}.ts` — §21 prompt + deterministic lesson.
- `src/app/api/advisor/{explain,extract}/route.ts` — auth-gated cloud routes.
- `src/lib/voice/{draft-schema,extract-with-model}.ts` — §20.5 extraction.
- `src/hooks/use-streamed-explanation.ts` + `advisor-explanation.tsx` — live streamed UI + lesson.

### Alternatives rejected
- **Persist the model explanation / keep a non-streaming `createAdvisorText`.** Rejected: it re-generates a paid call per result view and duplicates the chain logic. Persistence is deterministic; the hook is the sole model path.
- **Generic `generateObject` on the `ModelClient`.** Rejected: a Zod schema cannot be serialized to the server; extraction uses a dedicated route that owns the schema.

### Architectural invariants preserved
- Engine is the single source of decisions (dir untouched; model output is text-only and never parsed into a decision).
- Keys server-side only (`server-only` + fetch-only client + clean grep + build).
- Backward-compatible voice draft shape; thin orchestration.

## Behavior implemented

### Model-agnostic chain + deterministic floor
Env-ordered transports; first available wins; any failure falls through to the deterministic narrative.
Evidence: `resolve-model-clients.test.ts`, `use-streamed-explanation.test.ts`.

### Cloud explanation (streamed) + structured extraction, auth-gated
`/api/advisor/explain` streams text; `/api/advisor/extract` returns a Zod object; both require an authenticated user (401) and fail safe (400/502/503).
Evidence: `explain/route.test.ts`, `extract/route.test.ts`.

### On-device LiteRT provider
WebGPU-gated, lazy engine, system prompt via preface, streaming, cached engine with retry.
Evidence: `local-model-client.test.ts` (mocked engine). Live inference = manual Chrome smoke.

### Decision immutability (forbidden behavior)
A contradictory model is surfaced only as labelled prose; the hook exposes no decision field; persistence stores the engine decision.
Evidence: `use-streamed-explanation.test.ts`, `advisor-explanation.test.tsx`, `use-financial-state.test.tsx`.

### §20.5 extraction with regex fallback + one lesson
Cloud `generateObject` when configured (background, only before the user edits), else regex; one deterministic lesson per result.
Evidence: `extract-with-model.test.ts`, voice suite, `lessons.test.ts`, `advisor-explanation.test.tsx`.

## Files changed

| File | Change | Purpose |
| --- | --- | --- |
| `src/lib/ai/{types,mock-model-client,cloud-model-client,local-model-client,resolve-model-clients,model-spec,index}.ts` (+ tests) | new | model-agnostic seam, transports, env/model resolvers |
| `src/lib/advisor/{prompt,lessons}.ts` (+ tests) | new | §21 prompt, deterministic lesson |
| `src/lib/advisor/index.ts` | modified | slimmed to re-exports (model path → hook) |
| `src/app/api/advisor/{explain,extract}/route.ts` (+ tests) | new | auth-gated cloud routes |
| `src/lib/voice/{draft-schema,extract-with-model}.ts` (+ tests) | new | §20.5 extraction + fallback |
| `src/features/voice/components/voice-purchase-checker.tsx` | modified | background model upgrade (regex fallback) |
| `src/hooks/use-streamed-explanation.ts` (+ test) | new | streaming model path for the UI |
| `src/features/purchase-checker/components/advisor-explanation.tsx` (+ test) | new | streamed explanation + lesson |
| `src/features/purchase-checker/components/purchase-result.tsx` | modified | wired the explanation + lesson |
| `src/hooks/use-financial-state.ts` | modified | persists the deterministic narrative |
| `src/lib/advisor/litert-lm.{ts,test.ts}` | deleted | superseded by `LocalModelClient` |
| `.env.example`, `vitest.config.mts`, `src/testing/server-only-stub.ts` | modified/new | env docs + server-only test alias |
| `e2e/spendguard.spec.ts` | modified | asserts the Lesson on the result page |
| `package.json`, `package-lock.json` | modified | `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@litert-lm/core`, `@testing-library/dom` |

### Files intentionally not changed
- `src/lib/calculations/**` — the engine; the model must never alter it.

### Scope exceptions
`@testing-library/dom` was re-added as a dev dependency after the `--legacy-peer-deps` install (needed by the AI SDK's unrelated peer conflict) pruned it. Necessary to keep the existing component suites running; not scope-expanding.

## Database and migration changes

Not applicable — no schema or data changes this phase.

## Tests added or changed

| Test | Coverage |
| --- | --- |
| `src/lib/ai/*.test.ts` | seam, transports, env/model resolvers, `isTransportConfigured`, decision-confinement |
| `src/lib/advisor/{prompt,lessons}.test.ts` | §21 prompt determinism, lesson selection |
| `src/app/api/advisor/*/route.test.ts` | auth (401), validation, stream/object, 502/503 |
| `src/lib/voice/extract-with-model.test.ts` | model success / non-200 / bad shape / disabled / network error |
| `src/hooks/use-streamed-explanation.test.ts` | streaming, fallthrough, fallback, immutability |
| `src/features/purchase-checker/components/advisor-explanation.test.tsx` | fallback render, lesson, immutability render |

### Coverage boundaries
- Live cloud/on-device inference (real key / real WebGPU) not exercised in CI — manual smoke.
- E2E browser journey environment-blocked (below).

## Verification results

### Regression / gates
| Check | Command | Result |
| --- | --- | --- |
| Full suite | `npm test` | PASS (57 files / 316 tests) |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS (0 errors) |
| Coverage | `npm run test:coverage` | PASS (91.88% / 81.52% / 94.66% / 92.05%) |
| Build | `npm run build` | PASS (both routes built; server-only enforced) |

### Diff and scope checks
| Check | Command | Result |
| --- | --- | --- |
| Diff formatting | `git diff --check` | PASS |
| Forbidden files untouched | inspection | PASS (engine untouched) |

### Unrelated or environment-blocked checks
- **E2E** (`npm run e2e`): BLOCKED — a pre-existing dev server (PID 47207) holds the `portless` registration for `spendguard.localhost`; `reuseExistingServer:false` forces Playwright to spawn its own on :3100. Not killed (user's process). Runnable once the dev server is stopped. The result-page public path is otherwise covered by component/route/hook tests.

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Models selected/ordered by env, no code change | `resolve-model-clients.test.ts` | VERIFIED |
| On-device LiteRT wired behind the seam | `local-model-client.test.ts` (mocked engine) | VERIFIED (live = manual) |
| Cloud streams an explanation | `explain/route.test.ts` (mocked `ai`) | VERIFIED (live = manual) |
| Chain falls through to deterministic | `use-streamed-explanation.test.ts` | VERIFIED |
| Model never changes the decision | hook + component immutability tests; `use-financial-state` | VERIFIED |
| Transcript extraction w/ regex fallback | `extract-with-model.test.ts`, `extract/route.test.ts` | VERIFIED |
| One educational lesson surfaced | `lessons.test.ts`, `advisor-explanation.test.tsx` | VERIFIED |
| Keys stay server-side | `server-only` + grep + build | VERIFIED |
| Routes require auth | route 401 tests | VERIFIED |
| Public path works | component/route/hook tests | VERIFIED (e2e env-blocked) |
| Existing behavior unchanged | `npm test` (316) | VERIFIED |
| Coverage ≥ 80% | `test:coverage` | VERIFIED |
| No forbidden files changed | `git diff --name-only` | VERIFIED |
| Diff is structurally valid | `git diff --check` | VERIFIED |

## Independent review

### Correctness review (ecc:code-reviewer)
- Initial verdict: `NOT SAFE TO CONTINUE` — 2 BLOCKING: (1) `createAdvisorText` contract removed without a documented decision / chain test; (2) decision-immutability test absent.
- Resolution: (1) retirement made an explicit documented decision (see Deviations); chain fallthrough covered in `use-streamed-explanation.test.ts`. (2) immutability tests added at the hook and component levels.
- Re-verification verdict: `SAFE TO CHECKPOINT` — 0 blocking / 0 important / 0 minor; all findings confirmed resolved, engine untouched, immutability covered across three complementary tests.

### Security review (ecc:security-reviewer)
- Initial verdict: `SAFE AFTER REQUIRED FIXES` — 2 HIGH: route auth, `server-only`.
- Re-verification verdict: `SAFE TO CHECKPOINT` — both confirmed resolved; MEDIUM items (rate limiting, model-URL allowlist) carried to P11.

## Repair history
Repair cycle 1 (post-review): route auth + 401 tests; `server-only` + vitest alias + stub; immutability tests; `isStreaming` reset on throw; DRY `isTransportConfigured`; nullable extraction enums; `clients` test prop. All gates re-run green.

## Deviations from the original goal
- **Retired `createAdvisorText`** (goal §9 named it; §3.7/§4.4 called it backward-compatible). Persistence uses `createFallbackAdvice` (deterministic, instant, reproducible, offline); the model runs only in the live streaming hook, the single model path. A non-streaming orchestrator would be dead code or cause a redundant paid call per view. Chain fallthrough is fully tested in the hook. Net effect on the immutability invariant: none (model output is text-only).

## Remaining risks and limitations
- Live cloud/on-device inference is manual-smoke only (no key / no WebGPU in CI).
- Persisted explanation is deterministic by design (model text is a live enhancement, not saved).
- `@litert-lm/core` is early-preview (API may shift); WebGPU-only; large model download.

## Follow-up work
- P11: per-user rate limiting on advisor routes; allowlist/integrity check for `NEXT_PUBLIC_LITERT_MODEL_URL`; the privacy disclaimer/voice-note/delete-data surface.
- Optional: persist the streamed model explanation to history (currently deterministic-only).

## Guidance for the next milestone
The next milestone may rely on: the `ModelClient` seam + env chain, the auth-gated advisor routes, the deterministic lesson, and the streamed explanation hook. It must not assume: live model output in CI, or that the persisted `advisorText` is model-generated.

### Recommended next milestone
`11 — Privacy & safety surface` — Reason: it builds directly on the advisor routes/UI and should also land the deferred rate-limiting + model-URL guardrails.

## Human review checklist
- [ ] Apply the checkpoint patch and review the full diff.
- [ ] Confirm `src/lib/calculations/**` is untouched.
- [ ] Inspect route auth + `server-only` (no key reaches the client bundle).
- [ ] Confirm public contracts (voice draft shape) remain compatible.
- [ ] Confirm tests were executed (316 pass) and coverage holds.
- [ ] Note the e2e env-block and the manual-smoke boundary for live inference.
- [ ] Confirm no P11/P12 work started.

## Git and deployment status
- Commit created by agent: `NO`
- Pushed / merged / deployed by agent: `NO`
- Production data modified: `NO`

## Final disposition
- Agent recommendation: `READY FOR HUMAN REVIEW` — both independent reviews returned `SAFE TO CHECKPOINT`; one known env-block (e2e) and the manual-smoke boundary for live inference are documented.
- Human decision: `PENDING`
