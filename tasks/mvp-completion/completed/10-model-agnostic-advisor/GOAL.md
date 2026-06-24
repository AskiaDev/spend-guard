# Current Goal: 10 — Model-agnostic advisor (local LiteRT-LM + cloud, real integration)

## Goal metadata

- Feature: `mvp-completion`
- Phase: `10`
- Status: `IN PROGRESS`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (P10 — §11.8, §20.5, §21)
- Previous phase report: `tasks/mvp-completion/completed/9-weekly-advisor-report/REPORT.md`
- Decision (user, this run): **B — local + cloud**, full scope. On-device = LiteRT-LM Web API (`@litert-lm/core`, WebGPU). Cloud = Vercel AI SDK behind Next route handlers (keys server-side). Deterministic fallback is the always-on floor.

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router) + React 19 + TS (strict) + Supabase + Tailwind/shadcn. Tests: Vitest (jsdom) + RTL; Playwright e2e (auto-starts dev on `127.0.0.1:3100`).
- READ FIRST: `AGENTS.md` — read `node_modules/next/dist/docs/` before Next-specific code. (Done: route-handlers + streaming guides read.)
- Verified the LiteRT-LM Web API against the official docs (`developers.google.com/edge/litert-lm/js`): `@litert-lm/core`, `Engine.create({model, mainExecutorSettings:{maxNumTokens}})` → `engine.createConversation({preface:{messages:[{role:'system',...}]}})` → `for await (chunk of conversation.sendMessageStreaming(text)) chunk.content[0].text`; `engine.delete()`. WebGPU-only, early preview, models `gemma-4-E2B-it-web.litertlm` / `gemma-4-E4B-it-web.litertlm`.
- Commands (CODE ROOT): `npm run typecheck`, `npm run lint`, `npm test`, `npm test -- <path>`, `npm run test:coverage` (80% gate), `npm run build`, `npm run e2e`.
- Frontend rule: UI-bearing work invokes the `frontend-design` skill before writing UI; verify the real page via Playwright.
- Git boundary (HARD): never commit/push/merge/rebase/deploy. Capture the phase as a patch under `tasks/mvp-completion/completed/10-*/10-*.patch`.

## 1. Current project state

Complete (P1–P9, archived). Relevant seams:

- Engine `src/lib/calculations/**` → `evaluatePurchase` → `PurchaseDecisionResult` (decision, riskScore, reasons, safeToSpend, cooldownDays, ...). Single source of decisions.
- `src/lib/advisor/index.ts::createAdvisorText(result, purchase): Promise<string>` — tries `createLiteRtAdvice` (hardcoded `window.LiteRTLM?.generateText` stub) else `createFallbackAdvice` (deterministic, P9).
- `src/lib/voice/parsers.ts::extractPurchaseFromTranscript(transcript): VoicePurchaseDraft` — regex only.
- Advisor card `src/features/purchase-checker/components/purchase-result.tsx` renders `activeCheck.advisorText` (plain text, no stream/lesson).
- No AI dependency installed; no provider abstraction.

Before changing code: inspect the impl + current git diff, read the P9 report, preserve valid work, confirm the goal matches the repo.

## 2. Objective

Implement:

> A model-agnostic advisor where on-device (LiteRT-LM Web) and cloud (AI SDK) models plug in behind one ordered `ModelClient` chain selected by env, powering a streamed purchase explanation and voice transcript→fields extraction, with the deterministic engine still owning every decision and a deterministic fallback whenever no model is available.

This milestone owns:

- A generic `ModelClient` abstraction + an **ordered chain** factory (`src/lib/ai/**`): `NEXT_PUBLIC_AI_PROVIDER` is a comma-ordered list (e.g. `local,cloud`); the orchestrator tries each in order and uses the first that yields text, else the deterministic floor. Swap/reorder/disable models by editing env only.
- Real **on-device** provider: `LocalModelClient` over `@litert-lm/core` (WebGPU-gated, lazy dynamic import, system prompt via `preface`, streaming via `sendMessageStreaming`). Model URL from `NEXT_PUBLIC_LITERT_MODEL_URL` (default Gemma E2B). Returns unavailable (→ chain falls through) when WebGPU/engine is absent.
- Real **cloud** provider: `CloudModelClient` → Next route handlers `/api/advisor/explain` (streams text) and `/api/advisor/extract` (structured object via `generateObject`), running the Vercel AI SDK server-side. Model from server `ADVISOR_MODEL` (`"<provider>:<modelId>"`, ≥ anthropic+openai), key server-side only.
- `MockModelClient` — deterministic, for tests/dev.
- §21 prompt builder (system + decision template), reused by every real provider.
- Streamed advisor explanation in the result card (progressive text; deterministic fallback instantly / when unavailable).
- §20.5 transcript→fields extraction: cloud `generateObject` (Zod) when available, else regex fallback (on-device LiteRT is text-only → not used for structured extraction; documented).
- One deterministic educational lesson surfaced on the result.

This milestone does not include:

- P11 privacy surface (disclaimer text, voice-privacy note, delete-transcript/data) + cross-user RLS test.
- P12 e2e/coverage hardening beyond P10's own public path.
- Any change to §19 formulas/thresholds.
- Model-download UX polish / offline model caching strategy beyond the SDK default (follow-up).

## 3. Required behavior

1. Decision computed deterministically and shown/persisted independent of any model; the model only produces prose + extracted draft fields.
2. With `NEXT_PUBLIC_AI_PROVIDER` unset/empty: behaves exactly as today (deterministic text + regex extraction); no network, no engine load.
3. Provider chain is tried in order; the first available client that returns non-empty text wins; any error/timeout/unavailable falls through to the next, then to the deterministic narrative — never a broken state.
4. On-device `LocalModelClient` is used only when WebGPU is present (browser, `navigator.gpu`); otherwise it reports unavailable and the chain continues. Its live inference streams.
5. Cloud model resolved from `ADVISOR_MODEL` (`anthropic`/`openai` ≥ supported); unknown/missing spec or missing key → route returns a graceful non-200 → client treats as unavailable.
6. Model output never changes `decision`, `riskScore`, `reasons`, `cooldownDays`, or any numeric field (forbidden behavior, explicitly tested).
7. `createAdvisorText(result, purchase): Promise<string>` stays backward-compatible.
8. API keys stay server-side only; client code never imports `@ai-sdk/*` or the server model-spec module.
9. Exactly one relevant deterministic educational lesson per result.

## 4. Architectural invariants

1. Engine stays the single source of decisions; the model only explains. (PRD §19.)
2. Reuse existing formulas, Zod, persistence — do not copy.
3. Route handlers validate input (Zod) and never leak keys; they are stateless model calls (no user rows written) so they need not derive a `user_id`, but must reject malformed input.
4. `createAdvisorText` + voice draft shape stay backward-compatible.
5. Orchestration stays thin; deterministic floors live in the domain layer (advisor/voice), not in model clients; model clients are generic.
6. Completed phases are not redesigned.

Stop and report if the goal requires violating one of these.

## 5. Important behavioral definitions

### Model-agnostic / "pass any model with minimal change"

- `NEXT_PUBLIC_AI_PROVIDER` = ordered transport list ∈ `{local, cloud, mock}` (client-visible). Empty/unset → deterministic only.
- `NEXT_PUBLIC_LITERT_MODEL_URL` = on-device `.litertlm` model URL (client-visible; public model).
- Server `ADVISOR_MODEL` = `"<provider>:<modelId>"` (e.g. `anthropic:claude-haiku-4-5`); server reads the matching `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`.

Swapping a model = edit one env var. Adding a cloud vendor = one entry in the server model-spec map. No advisor/voice/engine/UI code change; never expose keys; an unavailable model must fall through, never break.

### "The model explains, never decides" (PRD §19)

Model receives the computed decision + numbers and writes prose / extracts a draft. It must not emit a different decision, alter any number, or be the source of the persisted decision. Persisted `PurchaseDecisionResult` is always the engine's output.

## 6. Existing implementation to inspect

`src/lib/advisor/{index,litert-lm,fallback-advisor}.ts`; `src/lib/voice/parsers.ts` + caller `src/features/voice/components/voice-purchase-checker.tsx` (`buildReviewDraft`); `src/types/finance.ts`; `src/hooks/use-financial-state.ts` (`runPurchaseCheck`); `src/features/purchase-checker/components/purchase-result.tsx`; Next docs for route-handlers + streaming.

## 7. Allowed files

- `src/lib/ai/**` (new): `types.ts`, `resolve-model-clients.ts`, `mock-model-client.ts`, `local-model-client.ts`, `cloud-model-client.ts`, `model-spec.ts` (server-only), `index.ts`
- `src/lib/advisor/index.ts`; new `src/lib/advisor/prompt.ts`, `src/lib/advisor/lessons.ts`; remove `src/lib/advisor/litert-lm.ts` (superseded — orphaned by this change)
- `src/lib/voice/extract-with-model.ts` (new); `src/features/voice/components/voice-purchase-checker.tsx`
- `src/app/api/advisor/explain/route.ts`, `src/app/api/advisor/extract/route.ts` (new)
- `src/hooks/use-streamed-explanation.ts` (new); `src/features/purchase-checker/components/purchase-result.tsx`
- `src/types/finance.ts` (additive only, if a shared model type is needed)
- `*.test.ts(x)` siblings; `.env.example`; `package.json` (+ `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@litert-lm/core`)
- `tasks/mvp-completion/STATUS.md`

Other files only if necessary, documented first, non-scope-expanding.

## 8. Forbidden files and scope

Do not modify `src/lib/calculations/**`, unrelated completed-phase files, P11/P12 surfaces, prod/env config, unrelated migrations/UI/API. Do not start P11/P12; add a competing decision path; weaken/remove tests; bypass validation; commit/push/merge/rebase/deploy.

## 9. Preferred implementation shape

```text
src/lib/ai/types.ts            ModelClient { id; isAvailable(); generateText(); streamText?(); generateObject?() }
src/lib/ai/resolve-model-clients.ts   env list → ModelClient[] (ordered); [] when unset
src/lib/ai/mock|local|cloud-model-client.ts
src/lib/ai/model-spec.ts       resolveServerModel("anthropic:claude-haiku-4-5") → AI SDK model (server-only)
src/app/api/advisor/explain/route.ts   POST → streamText(...).toTextStreamResponse()
src/app/api/advisor/extract/route.ts   POST → generateObject({schema}) → JSON
src/lib/advisor/index.ts       createAdvisorText: for client of resolveModelClients(): if available, try text; else fallback
src/lib/advisor/prompt.ts      buildAdvisorSystemPrompt() + buildAdvisorPrompt(result, purchase)   (§21)
src/lib/advisor/lessons.ts     getEducationalLesson(result) → {title, body}
src/lib/voice/extract-with-model.ts    extractPurchaseWithModel(transcript) → cloud generateObject else null; caller falls to regex
src/hooks/use-streamed-explanation.ts  client hook: stream from first capable client into the card
```

Local client lazy-imports `@litert-lm/core` only in browser with WebGPU (dynamic `import()`), reuses one cached engine, `delete()`s on teardown. Cloud client only `fetch()`s the route handlers (never imports `@ai-sdk/*`).

## 10. Required tests

1. `resolveModelClients` env matrix: unset→[]; `local`→[Local]; `cloud`→[Cloud]; `local,cloud`→[Local,Cloud]; `mock`→[Mock]; unknown token ignored.
2. `resolveServerModel` for anthropic/openai/unknown(throws or null → 503).
3. `createAdvisorText`: first client text wins; client throws/unavailable → next; all unavailable → deterministic fallback; no providers → fallback.
4. **Forbidden behavior**: a mock model returning a contradictory recommendation never changes persisted `decision`/numbers (assert at runPurchaseCheck / integration level).
5. Prompt builder: includes decision + key numbers + "explain, never decide"; deterministic.
6. Lesson selector: relevant lesson per decision; deterministic.
7. Extraction: cloud `generateObject` success → draft; failure/unavailable → regex fallback (same `VoicePurchaseDraft` shape).
8. Route handlers: reject malformed input; return text/JSON on success; graceful non-200 when key/model missing (mock the `ai` module).
9. Local client: WebGPU absent → `isAvailable()` false (no engine load); engine path covered with `@litert-lm/core` mocked (stream chunks → concatenated text). Real inference NOT in CI (documented).
10. Public path: render `PurchaseResult` → advisor explanation + lesson render; streaming mocked → progressive text appears.
11. Determinism: same input → same deterministic outputs.

At least one test exercises: public entry (PurchaseResult render / runPurchaseCheck / route POST) → real dependency (calculations / prompt) → new behavior → returned/persisted result.

## 11. Verification commands

```bash
npm test -- src/lib/ai
npm test -- src/lib/advisor
npm test -- src/lib/voice
npm test -- src/features/purchase-checker
npm test -- src/app/api/advisor
npm run typecheck
# public path / integration
npm test -- src/features/purchase-checker/components/purchase-result.test.tsx
npm run e2e -- e2e/spendguard.spec.ts    # deterministic-fallback path (no provider in CI): assert explanation + lesson render
# regression + gates
npm test
npm run lint
npm run test:coverage
npm run build
# scope/diff
git diff --check && git diff --stat && git diff --name-only && git status --short
```

(No migration this phase → no `supabase db reset`.)

## 12. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Models selected/ordered by env, no code change | `resolve-model-clients.test.ts` | NOT VERIFIED |
| On-device LiteRT provider wired behind the seam | `local-model-client.test.ts` (mocked `@litert-lm/core`) + manual Chrome smoke | NOT VERIFIED |
| Cloud model streams a real explanation | route tests (mocked `ai`) + manual smoke | NOT VERIFIED |
| Chain falls through to deterministic on failure | `src/lib/advisor` tests | NOT VERIFIED |
| Model never changes the decision | forbidden-behavior integration test | NOT VERIFIED |
| Transcript extraction w/ regex fallback | `src/lib/voice` tests | NOT VERIFIED |
| One educational lesson surfaced | lessons + `purchase-result.test.tsx` | NOT VERIFIED |
| Keys stay server-side | grep: client never imports `@ai-sdk/*`/model-spec | NOT VERIFIED |
| Public path works | `purchase-result.test.tsx` + e2e fallback | NOT VERIFIED |
| Existing behavior unchanged | `npm test` | NOT VERIFIED |
| Coverage ≥ 80% | `npm run test:coverage` | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |
| Diff structurally valid | `git diff --check` | NOT VERIFIED |

## 13. Execution workflow

Inner loop per behavior: re-read goal+status, smallest coherent unit, add/observe failing test, minimal pass, focused check, inspect diff, update STATUS.md. UI work → `frontend-design` first, Playwright verify.

## 14. Retry and stop conditions

≤ 3 materially different repair attempts per failure. Stop and report on: required product decision; goal conflicts with repo; forbidden file needed; public contract must change; invariant would break; `npm install` of `@litert-lm/core`/`ai`/`@ai-sdk/*` fails in this env (note it; keep the seam + mock + the providers that do install; mark the affected provider's live claim BLOCKED honestly).

## 15. Definition of Done

Every required behavior implemented; invariants preserved; focused tests pass; public path exercised (PurchaseResult render + a route POST + e2e fallback); regressions + lint pass; coverage ≥ 80%; determinism shown; decision-immutability test passes; no forbidden files changed; `git diff --check` clean; all claims evidenced; risks documented (live LiteRT/cloud inference not exercised in CI — manual Chrome/key smoke; persisted text = deterministic fallback by design); STATUS.md current; P11/P12 not started.

## 16. Final report

Per `REPORT_TEMPLATE.md`: outcome, files, exploration, design, behavior, commands/tests, claim-to-evidence, review findings, risks (no-WebGPU/no-key CI boundary; preview instability of `@litert-lm/core`; persisted text = deterministic fallback), forbidden/next-phase untouched, human-review checklist. No git writes.
