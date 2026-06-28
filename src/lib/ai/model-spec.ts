import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

/**
 * Server-only. Resolves the `ADVISOR_MODEL` spec (`"<provider>:<modelId>"`) into a
 * Vercel AI SDK model. This is the "swap any model with minimal change" knob:
 * change one env var to switch model, add one entry below to support a new vendor.
 * Imports the provider SDKs, so it must never be imported into client code.
 */
const DEFAULT_MODEL_SPEC = "openai:gpt-4o-mini";

const PROVIDERS = {
	anthropic: {
		create: (id: string) => anthropic(id),
		apiKeyEnv: "ANTHROPIC_API_KEY",
	},
	openai: { create: (id: string) => openai(id), apiKeyEnv: "OPENAI_API_KEY" },
} as const;

type ProviderName = keyof typeof PROVIDERS;

export function resolveServerModel(
	spec: string = process.env.ADVISOR_MODEL ?? DEFAULT_MODEL_SPEC,
) {
	const separator = spec.indexOf(":");
	const provider = (separator === -1 ? "" : spec.slice(0, separator))
		.trim()
		.toLowerCase();
	const modelId = (separator === -1 ? "" : spec.slice(separator + 1)).trim();
	const entry = PROVIDERS[provider as ProviderName];

	if (!entry || !modelId) {
		throw new Error(
			`Unsupported ADVISOR_MODEL "${spec}". Use "<provider>:<modelId>" with provider one of: ${Object.keys(PROVIDERS).join(", ")}.`,
		);
	}
	if (!process.env[entry.apiKeyEnv]) {
		throw new Error(
			`Missing ${entry.apiKeyEnv} for ADVISOR_MODEL "${spec}".`,
		);
	}

	return entry.create(modelId);
}
