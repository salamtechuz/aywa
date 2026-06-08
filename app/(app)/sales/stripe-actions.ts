"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getStripe, isStripeEnabled } from "@/lib/stripe/client";
import { getActiveWorkspace } from "@/lib/tenant";

export type StripeCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Creates (or reuses) a Stripe Checkout session for the given sales order.
 * Returns the hosted-checkout URL — paste into Send email body or open
 * directly. On payment success the Stripe webhook flips the order to INVOICED
 * and stamps `stripePaidAt`.
 */
export async function createStripeCheckoutForOrder(
  orderId: string,
): Promise<StripeCheckoutResult> {
  const denied = await assertCanWrite();
  if (denied) return { ok: false, error: denied.error };
  if (!isStripeEnabled()) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.",
    };
  }
  const stripe = await getStripe();
  if (!stripe) return { ok: false, error: "Stripe client unavailable" };

  const ws = await getActiveWorkspace();
  const order = await db.salesOrder.findFirst({
    where: { id: orderId, workspaceId: ws.id },
    include: {
      customer: true,
      lines: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!order) return { ok: false, error: "Order not found" };

  // Reuse an existing session if it's still open. Stripe enforces idempotency
  // on the session ID but the check here keeps the action UX consistent.
  if (order.stripeSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (existing.status === "open" && existing.url) {
        return { ok: true, url: existing.url };
      }
    } catch {
      // Old session expired or was deleted — fall through and create a new one.
    }
  }

  const origin = process.env.AUTH_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: order.lines.map((l) => {
      const grossAmount = l.unitPrice * (1 - l.discount / 100);
      // Stripe wants the unit price in the smallest currency unit (cents).
      const unitAmountCents = Math.round(grossAmount * 100);
      return {
        quantity: Math.max(1, Math.round(l.quantity)),
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: unitAmountCents,
          product_data: {
            name: l.description,
            metadata: { sku: l.product?.sku ?? "" },
          },
        },
      };
    }),
    customer_email: order.customer?.email ?? undefined,
    metadata: {
      orderId: order.id,
      workspaceId: ws.id,
      orderNumber: order.number,
    },
    success_url: `${origin}/sales?paid=${order.id}`,
    cancel_url: `${origin}/sales?cancelled=${order.id}`,
  });

  await db.salesOrder.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  await logAudit({
    action: "OTHER",
    entityType: "ORDER",
    entityId: order.id,
    summary: `Created Stripe checkout for ${order.number}`,
  });

  revalidatePath("/sales");
  return { ok: true, url: session.url ?? "" };
}
