import "server-only";

import type Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * Lazily constructs the Stripe client. The SDK (~18MB) is imported dynamically
 * so it stays out of the compile graph of routes that only reference a Stripe
 * server action — it loads on the first real checkout/webhook call.
 */
export async function getStripe(): Promise<Stripe | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;
  const { default: StripeClient } = await import("stripe");
  cached = new StripeClient(key, { apiVersion: "2026-04-22.dahlia" });
  return cached;
}

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
