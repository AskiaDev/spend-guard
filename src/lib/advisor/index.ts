// The deterministic narrative is the always-on floor and the persisted explanation.
// Model orchestration (the env-selected client chain) lives in the streaming hook
// `useStreamedExplanation`, which powers the live result-card explanation. Keeping a
// single model path avoids duplicating the chain logic or regenerating on save.
export { createFallbackAdvice } from "./fallback-advisor";
export { buildAdvisorPrompt, buildAdvisorSystemPrompt } from "./prompt";
export { getEducationalLesson } from "./lessons";
