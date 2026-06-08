import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Runs daily via Vercel Cron (see vercel.json). For every ACTIVE subscription
 * whose `nextRenewalDate` is today or in the past, generate a new DRAFT
 * sales order from the subscription's terms and advance the renewal date by
 * one billing period.
 *
 * Authenticated via the `CRON_SECRET` env var — Vercel sends it as the
 * `Authorization: Bearer <CRON_SECRET>` header. Falls back to "no secret
 * configured" mode for local development.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await db.subscription.findMany({
    where: {
      status: "ACTIVE",
      nextRenewalDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    include: { customer: true, product: true },
  });

  type ProcessedItem = {
    subscriptionId: string;
    orderNumber: string;
    amount: number;
  };
  const processed: ProcessedItem[] = [];

  for (const sub of due) {
    // Increment renewal date by billingPeriodMonths.
    const nextRenewal = sub.nextRenewalDate
      ? new Date(sub.nextRenewalDate)
      : new Date(now);
    nextRenewal.setMonth(nextRenewal.getMonth() + sub.billingPeriodMonths);

    // Generate the next sales order number for this workspace.
    const last = await db.salesOrder.findFirst({
      where: { workspaceId: sub.workspaceId },
      orderBy: { createdAt: "desc" },
      select: { number: true },
    });
    const lastNum = last?.number?.replace(/\D/g, "");
    const next = lastNum ? parseInt(lastNum, 10) + 1 : 1;
    const number = `SO-${String(next).padStart(4, "0")}`;

    const amount = sub.unitPrice * sub.quantity;
    const description = sub.product
      ? `${sub.product.name} — ${sub.billingPeriod.toLowerCase()} subscription`
      : `${sub.name} — ${sub.billingPeriod.toLowerCase()} subscription`;

    const order = await db.salesOrder.create({
      data: {
        workspaceId: sub.workspaceId,
        number,
        customerId: sub.customerId,
        status: "DRAFT",
        amount,
        currency: sub.currency,
        notes: `[recurring] Generated from subscription "${sub.name}".`,
        lines: {
          create: [
            {
              description,
              quantity: sub.quantity,
              unitPrice: sub.unitPrice,
              productId: sub.productId,
              position: 0,
            },
          ],
        },
      },
    });

    await db.subscription.update({
      where: { id: sub.id },
      data: { nextRenewalDate: nextRenewal },
    });

    processed.push({
      subscriptionId: sub.id,
      orderNumber: order.number,
      amount,
    });
  }

  return NextResponse.json({
    ok: true,
    generated: processed.length,
    items: processed,
    ranAt: now.toISOString(),
  });
}
