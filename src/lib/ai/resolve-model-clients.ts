import { createCloudModelClient } from "./cloud-model-client";
import { getLocalModelClient } from "./local-model-client";
import { createMockModelClient } from "./mock-model-client";
import type { ModelClient, ModelClientId } from "./types";

const FACTORIES: Record<ModelClientId, () => ModelClient> = {
  local: getLocalModelClient,
  cloud: createCloudModelClient,
  mock: createMockModelClient,
};

/**
 * Build the ordered model-client chain from env. `NEXT_PUBLIC_AI_PROVIDER` is a
 * comma-ordered list of transports (e.g. `"local,cloud"`); the advisor tries each
 * in order and uses the first that yields text, else the deterministic floor.
 * Unset/empty → `[]` (deterministic only). Unknown tokens are ignored, so a typo
 * degrades safely rather than throwing.
 */
export function resolveModelClients(
  spec: string | undefined = process.env.NEXT_PUBLIC_AI_PROVIDER
): ModelClient[] {
  if (!spec) return [];
  return spec
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token): token is ModelClientId => token in FACTORIES)
    .map((id) => FACTORIES[id]());
}

/** Whether a given transport is enabled in the env chain (single source of parsing). */
export function isTransportConfigured(
  id: ModelClientId,
  spec: string | undefined = process.env.NEXT_PUBLIC_AI_PROVIDER
): boolean {
  return resolveModelClients(spec).some((client) => client.id === id);
}
