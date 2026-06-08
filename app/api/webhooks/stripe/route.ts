import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { syncStockForSalesOrder } from "@/lib/inventory/sync";
import { syncEntryForSalesOrder } from "@/lib/accounting/auto";
import { deliverWebhook } from "@/lib/webhooks/deliver";

export const runtime = "nodejs";

/**
 * Stripe webhook ingestion. Configure in the Stripe dashboard:
 *   1. Developers → Webhooks → Add endpoint
 *   2. URL: https://<yourapp>/api/webhooks/stripe
 *   3. Subscribe to: checkout.session.completed, checkout.session.expired
 *   4. Copy the signing secret into STRIPE_WEBHOOK_SECRET
 */
export async function POST(req: NextRequest) {
  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event;
  try {
    if (secret && sig) {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } else {
      // Dev mode — no verification.
      event = JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[stripe] webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: Record<string, string>;
      payment_status?: string;
    };
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === "paid") {
      const order = await db.salesOrder.findUnique({
        where: { id: orderId },
        select: { id: true, workspaceId: true, status: true },
      });
      if (order) {
        await db.salesOrder.update({
          where: { id: orderId },
          data: { stripePaidAt: new Date(), status: "INVOICED" },
        });
        // Wire the payment into the rest of the system exactly like an in-app
        // status change to INVOICED would: deduct stock + post the accounting
        // entry. Both are idempotent and no-op if it was already INVOICED.
        if (order.status !== "INVOICED") {
          await syncStockForSalesOrder(order.workspaceId, orderId, order.status, "INVOICED");
          await syncEntryForSalesOrder(order.workspaceId, orderId, order.status, "INVOICED");
          void deliverWebhook(order.workspaceId, "order.invoiced", {
            id: orderId,
            status: "INVOICED",
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
