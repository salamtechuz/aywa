import { ClipboardList, FileCheck, DollarSign, AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { StatCard } from "@/components/patterns/stat-card";
import { formatMoney } from "@/lib/sales/stages";
import type { SalesOrderCardData } from "./sales-order-card";

export async function SalesStats({ orders }: { orders: SalesOrderCardData[] }) {
  const t = await getTranslations("sales");
  const open = orders.filter((o) => o.status !== "INVOICED" && o.status !== "CANCELLED");
  const invoiced = orders.filter((o) => o.status === "INVOICED");
  const drafts = orders.filter((o) => o.status === "DRAFT");
  const now = Date.now();
  const overdue = open.filter((o) => o.expectedDate && new Date(o.expectedDate).getTime() < now);

  const openValue = open.reduce((s, o) => s + o.amount, 0);
  const invoicedValue = invoiced.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={t("stats.openOrders")}
        value={formatMoney(openValue)}
        hint={t("stats.orderCount", { count: open.length })}
        icon={ClipboardList}
      />
      <StatCard
        label={t("stats.drafts")}
        value={String(drafts.length)}
        hint={t("stats.awaitingSend")}
        icon={FileCheck}
      />
      <StatCard
        label={t("stats.invoiced")}
        value={formatMoney(invoicedValue)}
        hint={t("stats.orderCount", { count: invoiced.length })}
        icon={DollarSign}
      />
      <StatCard
        label={t("stats.overdue")}
        value={String(overdue.length)}
        trend={overdue.length > 0 ? "down" : "flat"}
        hint={t("stats.pastExpectedDate")}
        icon={AlertTriangle}
      />
    </div>
  );
}
