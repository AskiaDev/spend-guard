// Test stub for the `server-only` package, which throws when imported outside an
// RSC server context. Aliased in vitest.config.mts so server-only modules (e.g.
// src/lib/ai/model-spec.ts) can be unit-tested. Production builds still use the real
// package, so the server/client boundary stays enforced at build time.
export {};
