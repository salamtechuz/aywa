import { DollarSign, Package, TrendingUp, Wallet, Target } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getActiveWorkspace } from "@/lib/tenant";
import { getReportData } from "@/lib/reports/queries";
import { getInventorySummary } from "@/lib/inventory/stock";
import { computeRecurringRevenue } from "@/lib/subscriptions/queries";
import { FunnelChart } from "@/components/reports/funnel-chart.client";
import { RevenueTrendChart } from "@/components/reports/revenue-trend-chart.client";

export const metadata = { title: "Reports" };

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ReportsPage() {
  const ws = await getActiveWorkspace();
  const [data, inventory, recurring] = await Promise.all([
    getReportData(ws.id),
    getInventorySummary(ws.id),
    computeRecurringRevenue(ws.id),
  ]);
  const inventoryValue = inventory.value;
  const lowStock = inventory.lowStock;
  const t = await getTranslations("reports");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {t("analytics")}
          </Badge>
        }
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("openPipeline")} value={fmt(data.kpi.openPipeline)} icon={Wallet} />
          <StatCard label={t("wonDeals")} value={fmt(data.kpi.totalWon)} icon={DollarSign} />
          <StatCard label={t("invoicedRevenue")} value={fmt(data.kpi.invoicedRevenue)} icon={TrendingUp} />
          <StatCard
            label={t("winRate")}
            value={`${data.kpi.overallWinRate.toFixed(0)}%`}
            hint={`${fmt(data.kpi.totalWon)} · ${fmt(data.kpi.totalLost)}`}
            icon={Target}
          />
        </div>

        {recurring.activeCount > 0 && (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="MRR"
              value={fmt(recurring.mrr)}
              icon={TrendingUp}
              hint={t("activeCount", { count: recurring.activeCount })}
            />
            <StatCard
              label="ARR"
              value={fmt(recurring.arr)}
              icon={DollarSign}
              hint={t("arrHint")}
            />
            <StatCard
              label={t("newMrrLabel")}
              value={fmt(recurring.newMrrThisMonth)}
              trend={recurring.newMrrThisMonth > 0 ? "up" : "flat"}
              icon={TrendingUp}
            />
            <StatCard
              label={t("churnedMrrLabel")}
              value={fmt(recurring.churnedMrrThisMonth)}
              trend={recurring.churnedMrrThisMonth > 0 ? "down" : "flat"}
              icon={DollarSign}
              hint={t("cancelledAllTime", { count: recurring.cancelledCount })}
            />
          </div>
        )}

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("inventoryAtCost")}
            value={fmt(inventoryValue.totalCost)}
            icon={Package}
            hint={t("skusCount", { count: inventoryValue.productCount })}
          />
          <StatCard
            label={t("inventoryAtRetail")}
            value={fmt(inventoryValue.totalRetail)}
            icon={TrendingUp}
            hint={t("marginHint", {
              percent:
                inventoryValue.totalRetail > 0
                  ? Math.round(
                      ((inventoryValue.totalRetail - inventoryValue.totalCost) /
                        inventoryValue.totalRetail) *
                        100,
                    )
                  : 0,
            })}
          />
          <StatCard
            label={t("lowStock")}
            value={String(lowStock.length)}
            trend={lowStock.length > 0 ? "down" : "flat"}
            hint={lowStock.length === 0 ? t("allGood") : t("belowReorder")}
            icon={Package}
          />
          <StatCard
            label={t("inventoryTurnover")}
            value={
              inventoryValue.totalCost > 0
                ? (data.kpi.invoicedRevenue / inventoryValue.totalCost).toFixed(1) + "×"
                : "—"
            }
            hint={t("turnoverHint")}
            icon={Target}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("pipelineFunnel")}</CardTitle>
              <CardDescription>{t("pipelineFunnelDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelChart data={data.funnel} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("revenueTrend")}</CardTitle>
              <CardDescription>{t("revenueTrendDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueTrendChart data={data.revenueTrend} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("winLossByOwner")}</CardTitle>
              <CardDescription>{t("winLossDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.winLossByOwner.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("noClosedDeals")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wider">{t("ownerHeader")}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-right">
                        {t("wonHeader")}
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-right">
                        {t("winRate")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.winLossByOwner.map((o) => (
                      <TableRow key={o.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {initials(o.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{o.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t("wonLostShort", { won: o.won, lost: o.lost })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {fmt(o.wonValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "inline-flex items-center text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full",
                              o.winRate >= 60
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : o.winRate >= 30
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-red-500/15 text-red-700 dark:text-red-300",
                            )}
                          >
                            {o.winRate.toFixed(0)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">{t("topCustomers")}</CardTitle>
              <CardDescription>{t("topCustomersDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("noCustomerActivity")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wider">{t("customerHeader")}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-right">
                        {t("revenueHeader")}
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-right">
                        {t("openHeader")}
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-right">
                        {t("ordersHeader")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topCustomers.map((c) => (
                      <TableRow key={`${c.name}-${c.company}`}>
                        <TableCell>
                          <div className="text-sm font-medium">{c.company ?? c.name}</div>
                          {c.company && (
                            <div className="text-xs text-muted-foreground">{c.name}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {fmt(c.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {c.openPipeline > 0 ? fmt(c.openPipeline) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {c.orders}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
