import "server-only";

import type { Resend } from "resend";

let cached: Resend | null = null;

/**
 * Lazily constructs the Resend client. The SDK is imported dynamically so it
 * stays out of the compile graph of routes that only reference an email-sending
 * server action — it loads on the first real send.
 */
export async function getResend(): Promise<Resend | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (cached) return cached;
  const { Resend: ResendClient } = await import("resend");
  cached = new ResendClient(key);
  return cached;
}

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "aywa <onboarding@resend.dev>";
