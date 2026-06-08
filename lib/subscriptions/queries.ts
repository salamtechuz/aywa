import "server-only";

import { db } from "@/lib/db";

export type SubscriptionSummary = {
  mrr: number;
  arr: number;
  activeCount: number;
  pausedCount: number;
  cancelledCount: number;
  /** Sum of unitPrice*quantity for subscriptions starting this calendar month. */
  newMrrThisMonth: number;
  /** Sum of unitPrice*quantity for subscriptions cancelled this calendar month. */
  churnedMrrThisMonth: number;
};

export async function listSubscriptions(workspaceId: string) {
  return db.subscription.findMany({
    where: { workspaceId },
    include: { customer: true, product: true },
    orderBy: [{ status: "asc" }, { unitPrice: "desc" }],
  });
}

/**
 * Computes MRR (monthly recurring revenue) from every ACTIVE subscription
 * whose endDate is either null or in the future. Each row contributes
 * `unitPrice * quantity / billingPeriodMonths` to the total.
 */
export async function computeRecurringRevenue(
  workspaceId: string,
): Promise<SubscriptionSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [active, paused, cancelled, newThisMonth, churnedThisMonth] = await Promise.all([
    db.subscription.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      select: { unitPrice: true, quantity: true, billingPeriodMonths: true },
    }),
    db.subscription.count({ where: { workspaceId, status: "PAUSED" } }),
    db.subscription.count({ where: { workspaceId, status: "CANCELLED" } }),
    db.subscription.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
        startDate: { gte: monthStart, lt: monthEnd },
      },
      select: { unitPrice: true, quantity: true, billingPeriodMonths: true },
    }),
    db.subscription.findMany({
      where: {
        workspaceId,
        status: "CANCELLED",
        updatedAt: { gte: monthStart, lt: monthEnd },
      },
      select: { unitPrice: true, quantity: true, billingPeriodMonths: true },
    }),
  ]);

  const sumMrr = (
    rows: { unitPrice: number; quantity: number; billingPeriodMonths: number }[],
  ) =>
    rows.reduce(
      (sum, r) => sum + (r.unitPrice * r.quantity) / Math.max(r.billingPeriodMonths, 1),
      0,
    );

  const mrr = sumMrr(active);
  return {
    mrr,
    arr: mrr * 12,
    activeCount: active.length,
    pausedCount: paused,
    cancelledCount: cancelled,
    newMrrThisMonth: sumMrr(newThisMonth),
    churnedMrrThisMonth: sumMrr(churnedThisMonth),
  };
}
