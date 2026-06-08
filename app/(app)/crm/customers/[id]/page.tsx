import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Mail,
  Phone,
  ShoppingCart,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { cn } from "@/lib/utils";
import { isAiEnabled } from "@/lib/ai/client";
import { loadCustomer360 } from "@/lib/crm/customer-360";
import { TAG_SWATCH_CLASS, safeTagColor } from "@/lib/crm/tags";
import { getActiveWorkspace } from "@/lib/tenant";
import { AccountBriefPanel } from "@/components/ai/account-brief-panel";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";

export const dynamic = "force-dynamic";

function fmtMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type AgoDescriptor =
  | { kind: "today" | "yesterday" }
  | { kind: "daysAgo" | "monthsAgo" | "yearsAgo"; n: number };

function daysAgo(d: Date): AgoDescriptor {
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "yesterday" };
  if (days < 30) return { kind: "daysAgo", n: days };
  if (days < 365) return { kind: "monthsAgo", n: Math.floor(days / 30) };
  return { kind: "yearsAgo", n: Math.floor(days / 365) };
}

function agoText(
  rel: AgoDescriptor,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  switch (rel.kind) {
    case "today":
      return t("ago.today");
    case "yesterday":
      return t("ago.yesterday");
    case "daysAgo":
      return t("ago.daysAgo", { n: rel.n });
    case "monthsAgo":
      return t("ago.monthsAgo", { n: rel.n });
    case "yearsAgo":
      return t("ago.yearsAgo", { n: rel.n });
  }
}

const STAGE_BADGE: Record<string, string> = {
  NEW: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  QUALIFIED: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  PROPOSAL: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  NEGOTIATION: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  WON: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  LOST: "bg-muted text-muted-foreground",
};

const ORDER_STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  CONFIRMED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  DELIVERED: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  INVOICED: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getActiveWorkspace();
  const data = await loadCustomer360(ws.id, id);
  if (!data) notFound();

  const t = await getTranslations("crm.customer360");
  const tStages = await getTranslations("crm.stages");
  const tStatuses = await getTranslations("sales.statuses");
  const tTypes = await getTranslations("crm.activity.types");

  const activityTypeLabel = (type: string) => {
    switch (type) {
      case "NOTE":
        return tTypes("note");
      case "CALL":
        return tTypes("call");
      case "EMAIL":
        return tTypes("email");
      case "MEETING":
        return tTypes("meeting");
      case "TASK":
        return tTypes("task");
      default:
        return type;
    }
  };

  const { contact, metrics, deals, orders, activities, attachments } = data;
  const displayName = contact.company ?? contact.name;
  const subline = contact.company ? contact.name : null;

  return (
    <>
      <PageHeader
        title={displayName}
        description={
          <>
            <Link
              href="/crm/customers"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> {t("allCustomers")}
            </Link>
            {subline && <span className="ml-3 text-sm text-muted-foreground">{subline}</span>}
          </>
        }
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {contact.type === "COMPANY" ? t("account") : t("person")}
          </Badge>
        }
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-base font-semibold truncate">{displayName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {contact.type === "COMPANY" ? (
                      <Building2 className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    {(contact.type === "COMPANY" ? t("account") : t("person")) +
                      " · " +
                      t("customerSince", { date: fmtDate(contact.createdAt) })}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{contact.phone}</span>
                  </a>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {t("firstTouch", { date: fmtDate(metrics.firstTouch) })}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {t("lastTouch", { ago: agoText(daysAgo(metrics.lastTouch), t) })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label={t("lifetimeValue")}
              value={fmtMoney(metrics.lifetimeValue)}
              icon={DollarSign}
            />
            <StatCard
              label={t("openPipeline")}
              value={fmtMoney(metrics.openPipelineValue)}
              icon={TrendingUp}
              hint={t("openDeals", { count: metrics.openDeals })}
            />
            <StatCard
              label={t("winRate")}
              value={
                metrics.winRate === null ? "—" : `${metrics.winRate.toFixed(0)}%`
              }
              icon={Target}
              hint={t("winLoss", { won: metrics.wonDeals, lost: metrics.lostDeals })}
            />
            <StatCard
              label={t("avgOrder")}
              value={fmtMoney(metrics.avgOrderValue)}
              icon={ShoppingCart}
              hint={t("ordersCount", { count: metrics.totalOrders })}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span>{t("aiBriefTitle")}</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {t("beta")}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t("aiBriefDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountBriefPanel contactId={contact.id} aiEnabled={isAiEnabled()} />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dealsTitle")}</CardTitle>
              <CardDescription>
                {t("dealsSubtitle", {
                  total: metrics.totalDeals,
                  open: fmtMoney(metrics.openPipelineValue),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("noDeals")}
                </p>
              ) : (
                <div className="space-y-2">
                  {deals.map((d) => (
                    <Link
                      key={d.id}
                      href={`/crm?deal=${d.id}`}
                      className="block rounded-md border bg-card hover:bg-accent/50 transition-colors px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{d.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {t("dealMeta", {
                              owner: d.ownerName ?? t("unassigned"),
                              ago: agoText(daysAgo(d.updatedAt), t),
                            })}
                          </div>
                          {d.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {d.tags.map((t) => (
                                <span
                                  key={t.id}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                    "bg-muted text-foreground",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-1.5 w-1.5 rounded-full",
                                      TAG_SWATCH_CLASS[safeTagColor(t.color)],
                                    )}
                                  />
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-semibold tabular-nums">
                            {fmtMoney(d.value, d.currency)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                              STAGE_BADGE[d.stage] ?? STAGE_BADGE.NEW,
                            )}
                          >
                            {tStages(d.stage.toLowerCase())}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("ordersTitle")}</CardTitle>
              <CardDescription>
                {t("ordersSubtitle", {
                  total: metrics.totalOrders,
                  invoiced: fmtMoney(metrics.invoicedRevenue),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("noOrders")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wider">#</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">{t("status")}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">{t("date")}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-right">{t("amount")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link
                            href={`/sales?order=${o.id}`}
                            className="text-sm font-medium hover:text-primary"
                          >
                            {o.number}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">
                            {t("lineCount", { count: o.lineCount })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                              ORDER_STATUS_BADGE[o.status] ?? ORDER_STATUS_BADGE.DRAFT,
                            )}
                          >
                            {tStatuses(o.status.toLowerCase())}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(o.orderDate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {fmtMoney(o.amount, o.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={`/api/quotes/${o.id}/pdf`}
                            target="_blank"
                            rel="noopener"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            PDF
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("activityTimeline")}</CardTitle>
            <CardDescription>
              {t("activityTimelineDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("noActivities")}
              </p>
            ) : (
              <ol className="space-y-3">
                {activities.slice(0, 20).map((a) => (
                  <li
                    key={a.id}
                    className="flex gap-3 border-l-2 border-muted pl-3 py-1"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold uppercase tracking-wider">
                          {activityTypeLabel(a.type)}
                        </span>
                        <Link
                          href={`/crm?deal=${a.dealId}`}
                          className="font-medium text-foreground hover:text-primary truncate"
                        >
                          {a.title}
                        </Link>
                        <span className="text-muted-foreground">
                          {t("on")}{" "}
                          <Link
                            href={`/crm?deal=${a.dealId}`}
                            className="hover:text-foreground"
                          >
                            {a.dealName}
                          </Link>
                        </span>
                        {a.doneAt && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          >
                            {t("done")}
                          </Badge>
                        )}
                      </div>
                      {a.body && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {a.body}
                        </p>
                      )}
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {a.ownerName ? `${a.ownerName} · ` : ""}
                        {agoText(daysAgo(a.createdAt), t)}
                      </div>
                    </div>
                  </li>
                ))}
                {activities.length > 20 && (
                  <li className="text-[11px] text-muted-foreground text-center pt-1">
                    {t("moreActivities", { count: activities.length - 20 })}
                  </li>
                )}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("files")}</CardTitle>
            <CardDescription>
              {t("filesDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttachmentsPanel
              entityType="CONTACT"
              entityId={contact.id}
              attachments={attachments}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
