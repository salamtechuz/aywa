import { AlertTriangle, DollarSign, ShoppingCart, Users, Package, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listLowStock } from "@/lib/inventory/stock";
import { getActiveWorkspace } from "@/lib/tenant";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";

const RECENT_ACTIVITY = [
  {
    icon: ShoppingCart,
    color: "text-emerald-600",
    titleKey: "activityNewOrderTitle",
    metaKey: "activityNewOrderMeta",
  },
  {
    icon: Users,
    color: "text-blue-600",
    titleKey: "activityLeadQualifiedTitle",
    metaKey: "activityLeadQualifiedMeta",
  },
  {
    icon: Package,
    color: "text-amber-600",
    titleKey: "activityLowStockTitle",
    metaKey: "activityLowStockMeta",
  },
  {
    icon: DollarSign,
    color: "text-violet-600",
    titleKey: "activityInvoicePaidTitle",
    metaKey: "activityInvoicePaidMeta",
  },
] as const;

const QUICK_ACTIONS = [
  { labelKey: "quickActionCreateSalesOrder", href: "/sales" },
  { labelKey: "quickActionAddCustomer", href: "/crm" },
  { labelKey: "quickActionReceiveStock", href: "/inventory" },
  { labelKey: "quickActionRunReport", href: "/reports" },
] as const;

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const ws = await getActiveWorkspace();
  const lowStock = await listLowStock(ws.id);
  return (
    <>
      <WelcomeTour />
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="outline">{t("export")}</Button>
            <Button>{t("newTransaction")}</Button>
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("revenueMtd")} value="$57,800" delta={12.4} icon={DollarSign} />
          <StatCard label={t("newCustomers")} value="34" delta={8.2} icon={Users} />
          <StatCard label={t("openOrders")} value="128" delta={-3.1} icon={ShoppingCart} />
          <StatCard
            label={t("lowStockSkus")}
            value={String(lowStock.length)}
            trend={lowStock.length > 0 ? "down" : "flat"}
            hint={lowStock.length === 0 ? t("hintAllGood") : t("hintBelowReorder")}
            icon={Package}
          />
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{t("revenueVsExpenses")}</CardTitle>
                <CardDescription>{t("trailing12Months")}</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-1)" }} />
                  {t("legendRevenue")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-2)" }} />
                  {t("legendExpenses")}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("quickActions")}</CardTitle>
              <CardDescription>{t("quickActionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_ACTIONS.map((a) => (
                <a
                  key={a.labelKey}
                  href={a.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md border bg-card hover:bg-accent transition-colors group"
                >
                  <span className="text-sm font-medium">{t(a.labelKey)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        {lowStock.length > 0 && (
          <Card className="border-red-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <div>
                  <CardTitle className="text-base">{t("lowStockTitle")}</CardTitle>
                  <CardDescription>
                    {t("lowStockSummary", { count: lowStock.length })}
                  </CardDescription>
                </div>
              </div>
              <Link
                href="/inventory"
                className="text-xs text-primary hover:underline font-medium"
              >
                {t("viewInventory")} →
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {lowStock.slice(0, 6).map((p) => {
                const ratio = p.reorderAt > 0 ? p.onHand / p.reorderAt : 0;
                const critical = ratio <= 0.25;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center",
                        critical
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        <span className="font-mono">{p.sku}</span> · {p.onHand} {p.unit} left ·
                        reorder at {p.reorderAt}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wider font-bold tabular-nums shrink-0",
                        critical
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {p.onHand === 0 ? "OUT" : `${Math.round(ratio * 100)}%`}
                    </span>
                  </div>
                );
              })}
              {lowStock.length > 6 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  {t("moreCount", { count: lowStock.length - 6 })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
              <CardDescription>{t("recentActivityDesc")}</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">{t("liveBadge")}</Badge>
          </CardHeader>
          <CardContent className="space-y-1">
            {RECENT_ACTIVITY.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className={`h-8 w-8 rounded-md bg-muted flex items-center justify-center ${a.color}`}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{t(a.titleKey)}</div>
                  <div className="text-xs text-muted-foreground truncate">{t(a.metaKey)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
