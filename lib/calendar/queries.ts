import "server-only";

import { db } from "@/lib/db";

export type CalendarEventKind =
  | "activity-due"
  | "activity-done"
  | "deal-close"
  | "order-delivery";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  date: Date;
  title: string;
  subtitle?: string;
  href: string;
  /** Indicates whether the event has passed its scheduled date and is still pending. */
  overdue?: boolean;
  /** Optional money amount tied to the event (deal value, order amount). */
  amount?: number;
  currency?: string;
};

/**
 * Returns every scheduled event in the workspace within [from, to).
 * Aggregates: CRM activities (dueAt), deals expected to close (expectedCloseDate),
 * and sales orders with an expectedDate. WON/LOST deals and CANCELLED/INVOICED
 * orders are excluded because they are no longer "scheduled" in any operational sense.
 */
export async function listCalendarEvents(
  workspaceId: string,
  from: Date,
  to: Date,
): Promise<CalendarEvent[]> {
  const now = new Date();

  const [activities, deals, orders] = await Promise.all([
    db.activity.findMany({
      where: {
        workspaceId,
        dueAt: { gte: from, lt: to },
      },
      include: { deal: { select: { id: true, name: true } } },
    }),
    db.deal.findMany({
      where: {
        workspaceId,
        expectedCloseDate: { gte: from, lt: to },
        stage: { notIn: ["WON", "LOST"] },
      },
      include: { contact: { select: { name: true } } },
    }),
    db.salesOrder.findMany({
      where: {
        workspaceId,
        expectedDate: { gte: from, lt: to },
        status: { notIn: ["CANCELLED", "INVOICED"] },
      },
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const events: CalendarEvent[] = [];

  for (const a of activities) {
    if (!a.dueAt) continue;
    const isDone = Boolean(a.doneAt);
    events.push({
      id: `activity:${a.id}`,
      kind: isDone ? "activity-done" : "activity-due",
      date: a.dueAt,
      title: a.title,
      subtitle: a.deal?.name ?? a.type,
      href: a.dealId ? `/crm?deal=${a.dealId}` : "/crm",
      overdue: !isDone && a.dueAt < now,
    });
  }

  for (const d of deals) {
    if (!d.expectedCloseDate) continue;
    events.push({
      id: `deal:${d.id}`,
      kind: "deal-close",
      date: d.expectedCloseDate,
      title: d.name,
      subtitle: d.contact?.name ?? d.ownerName ?? undefined,
      href: `/crm?deal=${d.id}`,
      overdue: d.expectedCloseDate < now,
      amount: d.value,
      currency: d.currency,
    });
  }

  for (const o of orders) {
    if (!o.expectedDate) continue;
    events.push({
      id: `order:${o.id}`,
      kind: "order-delivery",
      date: o.expectedDate,
      title: `${o.number}${o.customer?.name ? ` · ${o.customer.name}` : ""}`,
      subtitle: o.status,
      href: `/sales?order=${o.id}`,
      overdue: o.expectedDate < now,
      amount: o.amount,
      currency: o.currency,
    });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}
