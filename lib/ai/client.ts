import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

/**
 * Lazily constructs the Anthropic client. The SDK is imported dynamically so it
 * never enters the compile graph of routes that merely reference an AI server
 * action — it's only loaded the first time an AI call actually runs.
 */
export async function getAnthropic(): Promise<Anthropic | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (cached) return cached;
  const { default: AnthropicClient } = await import("@anthropic-ai/sdk");
  cached = new AnthropicClient({ apiKey: key });
  return cached;
}

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
