import "server-only";

import { db } from "@/lib/db";

export type ReportData = Awaited<ReturnType<typeof getReportData>>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getReportData(workspaceId: string) {
  const [deals, orders] = await Promise.all([
    db.deal.findMany({
      where: { workspaceId, kind: "OPPORTUNITY" },
      include: { contact: true },
    }),
    db.salesOrder.findMany({
      where: { workspaceId },
      select: {
        amount: true,
        status: true,
        updatedAt: true,
        customer: { select: { id: true, name: true, company: true } },
      },
    }),
  ]);

  // 1. Funnel by stage (open opportunities only)
  const stageOrder = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"] as const;
  const funnel = stageOrder.map((stage) => {
    const inStage = deals.filter((d) => d.stage === stage);
    return {
      stage,
      label: stage[0] + stage.slice(1).toLowerCase(),
      count: inStage.length,
      value: inStage.reduce((s, d) => s + d.value, 0),
    };
  });

  // 2. Revenue trend by month (won deals + invoiced orders, last 12 months)
  const now = new Date();
  const monthBuckets: { month: string; deals: number; orders: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      month: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      deals: 0,
      orders: 0,
    });
  }
  const earliest = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime();

  for (const d of deals) {
    if (d.stage !== "WON") continue;
    const t = new Date(d.updatedAt).getTime();
    if (t < earliest) continue;
    const date = new Date(d.updatedAt);
    const idx = monthBuckets.findIndex(
      (b) => b.month === `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
    );
    if (idx >= 0) monthBuckets[idx].deals += d.value;
  }
  for (const o of orders) {
    if (o.status !== "INVOICED") continue;
    const t = new Date(o.updatedAt).getTime();
    if (t < earliest) continue;
    const date = new Date(o.updatedAt);
    const idx = monthBuckets.findIndex(
      (b) => b.month === `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
    );
    if (idx >= 0) monthBuckets[idx].orders += o.amount;
  }

  // If everything fell in current month (seed data), still useful — show as is.
  const revenueTrend = monthBuckets;

  // 3. Win/loss by owner
  const ownerMap = new Map<string, { name: string; won: number; lost: number; wonValue: number; lostValue: number }>();
  for (const d of deals) {
    if (d.stage !== "WON" && d.stage !== "LOST") continue;
    const key = d.ownerName ?? "Unassigned";
    const cur = ownerMap.get(key) ?? {
      name: key,
      won: 0,
      lost: 0,
      wonValue: 0,
      lostValue: 0,
    };
    if (d.stage === "WON") {
      cur.won++;
      cur.wonValue += d.value;
    } else {
      cur.lost++;
      cur.lostValue += d.value;
    }
    ownerMap.set(key, cur);
  }
  const winLossByOwner = [...ownerMap.values()]
    .map((o) => ({
      ...o,
      winRate: o.won + o.lost > 0 ? (o.won / (o.won + o.lost)) * 100 : 0,
    }))
    .sort((a, b) => b.wonValue - a.wonValue);

  // 4. Top customers by value (deals.won + orders.invoiced + open pipeline)
  const customerMap = new Map<
    string,
    { name: string; company: string | null; revenue: number; openPipeline: number; orders: number }
  >();
  for (const d of deals) {
    if (!d.contact) continue;
    const key = d.contact.id;
    const cur = customerMap.get(key) ?? {
      name: d.contact.name,
      company: d.contact.company,
      revenue: 0,
      openPipeline: 0,
      orders: 0,
    };
    if (d.stage === "WON") cur.revenue += d.value;
    else if (d.stage !== "LOST") cur.openPipeline += d.value;
    customerMap.set(key, cur);
  }
  for (const o of orders) {
    if (!o.customer) continue;
    const key = o.customer.id;
    const cur = customerMap.get(key) ?? {
      name: o.customer.name,
      company: o.customer.company,
      revenue: 0,
      openPipeline: 0,
      orders: 0,
    };
    if (o.status === "INVOICED") cur.revenue += o.amount;
    cur.orders++;
    customerMap.set(key, cur);
  }
  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.revenue + b.openPipeline - (a.revenue + a.openPipeline))
    .slice(0, 8);

  // KPIs
  const totalWon = deals.filter((d) => d.stage === "WON").reduce((s, d) => s + d.value, 0);
  const totalLost = deals.filter((d) => d.stage === "LOST").reduce((s, d) => s + d.value, 0);
  const openPipeline = deals
    .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
    .reduce((s, d) => s + d.value, 0);
  const invoicedRevenue = orders
    .filter((o) => o.status === "INVOICED")
    .reduce((s, o) => s + o.amount, 0);
  const closedCount =
    deals.filter((d) => d.stage === "WON").length + deals.filter((d) => d.stage === "LOST").length;
  const overallWinRate =
    closedCount > 0 ? (deals.filter((d) => d.stage === "WON").length / closedCount) * 100 : 0;

  return {
    kpi: { totalWon, totalLost, openPipeline, invoicedRevenue, overallWinRate },
    funnel,
    revenueTrend,
    winLossByOwner,
    topCustomers,
  };
}
