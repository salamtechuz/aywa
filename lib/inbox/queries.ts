import "server-only";

import { db } from "@/lib/db";

export type InboxItemKind =
  | "task-overdue"
  | "task-today"
  | "task-upcoming"
  | "deal-closing"
  | "deal-stale"
  | "order-overdue";

export type InboxItem = {
  id: string;
  kind: InboxItemKind;
  priority: number; // higher = more urgent
  title: string;
  subtitle: string | null;
  href: string;
  dueAt: Date | null;
  amount: number | null;
  currency: string | null;
  ownerName: string | null;
};

const STALE_THRESHOLD_DAYS = 14;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * Returns the prioritized inbox for a workspace. Each item is something the
 * user should act on today or this week. Higher `priority` = more urgent.
 *
 * Sources:
 *  - CRM Activities with dueAt set, not yet done
 *  - Open Deals with expectedCloseDate this week
 *  - Open Deals (kind=OPPORTUNITY) with no Activity update in 14+ days
 *  - Sales Orders past their expectedDate but not yet INVOICED/CANCELLED
 */
export async function loadInbox(workspaceId: string): Promise<InboxItem[]> {
  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(addDays(today, 7));
  const staleThreshold = addDays(today, -STALE_THRESHOLD_DAYS);

  const [openActivities, closingDeals, openDeals, lateOrders] = await Promise.all([
    db.activity.findMany({
      where: {
        workspaceId,
        doneAt: null,
        dueAt: { not: null, lte: weekEnd },
      },
      include: { deal: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
    }),
    db.deal.findMany({
      where: {
        workspaceId,
        stage: { notIn: ["WON", "LOST"] },
        expectedCloseDate: { gte: today, lte: weekEnd },
      },
      include: { contact: { select: { name: true, company: true } } },
      orderBy: { expectedCloseDate: "asc" },
    }),
    db.deal.findMany({
      where: {
        workspaceId,
        stage: { notIn: ["WON", "LOST"] },
        kind: "OPPORTUNITY",
        updatedAt: { lt: staleThreshold },
      },
      include: { contact: { select: { name: true, company: true } } },
      orderBy: { updatedAt: "asc" },
      take: 20,
    }),
    db.salesOrder.findMany({
      where: {
        workspaceId,
        status: { notIn: ["INVOICED", "CANCELLED"] },
        expectedDate: { not: null, lt: today },
      },
      include: { customer: { select: { name: true, company: true } } },
      orderBy: { expectedDate: "asc" },
    }),
  ]);

  const items: InboxItem[] = [];

  for (const a of openActivities) {
    if (!a.dueAt) continue;
    const overdue = a.dueAt < today;
    const dueToday = a.dueAt >= today && a.dueAt <= todayEnd;
    const kind: InboxItemKind = overdue
      ? "task-overdue"
      : dueToday
        ? "task-today"
        : "task-upcoming";
    items.push({
      id: `activity:${a.id}`,
      kind,
      priority: overdue ? 100 : dueToday ? 80 : 40,
      title: a.title,
      subtitle: a.deal?.name ?? `[${a.type}]`,
      href: a.dealId ? `/crm?deal=${a.dealId}` : "/crm",
      dueAt: a.dueAt,
      amount: null,
      currency: null,
      ownerName: a.ownerName,
    });
  }

  for (const d of closingDeals) {
    if (!d.expectedCloseDate) continue;
    items.push({
      id: `deal-close:${d.id}`,
      kind: "deal-closing",
      priority: 70,
      title: `${d.name} closes ${formatDay(d.expectedCloseDate, today)}`,
      subtitle: d.contact?.company ?? d.contact?.name ?? d.stage,
      href: `/crm?deal=${d.id}`,
      dueAt: d.expectedCloseDate,
      amount: d.value,
      currency: d.currency,
      ownerName: d.ownerName,
    });
  }

  for (const d of openDeals) {
    items.push({
      id: `deal-stale:${d.id}`,
      kind: "deal-stale",
      priority: 30,
      title: `${d.name} — no activity in ${Math.floor((now.getTime() - d.updatedAt.getTime()) / 86_400_000)}d`,
      subtitle: d.contact?.company ?? d.contact?.name ?? d.stage,
      href: `/crm?deal=${d.id}`,
      dueAt: null,
      amount: d.value,
      currency: d.currency,
      ownerName: d.ownerName,
    });
  }

  for (const o of lateOrders) {
    if (!o.expectedDate) continue;
    const daysLate = Math.floor((now.getTime() - o.expectedDate.getTime()) / 86_400_000);
    items.push({
      id: `order-late:${o.id}`,
      kind: "order-overdue",
      priority: 90,
      title: `${o.number} overdue by ${daysLate}d`,
      subtitle: o.customer?.company ?? o.customer?.name ?? o.status,
      href: `/sales?order=${o.id}`,
      dueAt: o.expectedDate,
      amount: o.amount,
      currency: o.currency,
      ownerName: o.ownerName,
    });
  }

  items.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return 0;
  });

  return items;
}

function formatDay(d: Date, today: Date): string {
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 0) return `${-days}d ago`;
  return `in ${days}d`;
}

export type InboxSummary = {
  total: number;
  urgentCount: number; // overdue + today + closing + order-overdue
};

export async function getInboxSummary(workspaceId: string): Promise<InboxSummary> {
  const items = await loadInbox(workspaceId);
  const urgent = items.filter(
    (i) =>
      i.kind === "task-overdue" ||
      i.kind === "task-today" ||
      i.kind === "order-overdue" ||
      i.kind === "deal-closing",
  ).length;
  return { total: items.length, urgentCount: urgent };
}
