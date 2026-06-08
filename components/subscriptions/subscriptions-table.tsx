"use client";

import {
  MoreHorizontal,
  Pause,
  PlayCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  cancelSubscription,
  deleteSubscription,
  pauseSubscription,
  resumeSubscription,
} from "@/app/(app)/subscriptions/actions";

export type SubscriptionRow = {
  id: string;
  name: string;
  status: string;
  billingPeriod: string;
  billingPeriodMonths: number;
  quantity: number;
  unitPrice: number;
  currency: string;
  startDate: Date | string;
  endDate: Date | string | null;
  nextRenewalDate: Date | string | null;
  notes: string | null;
  customer: { id: string; name: string; company: string | null } | null;
  product: { id: string; sku: string; name: string } | null;
};

function fmtMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function relativeDate(
  d: Date | string | null,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return t("relToday");
  if (days === 1) return t("relTomorrow");
  if (days === -1) return t("relYesterday");
  if (days > 0 && days < 30) return t("relInDays", { days });
  if (days < 0 && days > -30) return t("relDaysAgo", { days: -days });
  return null;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  PAUSED: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CANCELLED: "bg-muted text-muted-foreground",
};

function RowActions({ row }: { row: SubscriptionRow }) {
  const t = useTranslations("subscriptions");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean }>, successLabel: string) => () => {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(successLabel);
      else toast.error(t("actionFailed"));
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" disabled={pending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        {row.status === "ACTIVE" && (
          <DropdownMenuItem onClick={run(() => pauseSubscription(row.id), t("toastPaused"))}>
            <Pause className="h-3.5 w-3.5 mr-2" />
            {t("actionPause")}
          </DropdownMenuItem>
        )}
        {row.status === "PAUSED" && (
          <DropdownMenuItem onClick={run(() => resumeSubscription(row.id), t("toastResumed"))}>
            <PlayCircle className="h-3.5 w-3.5 mr-2" />
            {t("actionResume")}
          </DropdownMenuItem>
        )}
        {row.status === "CANCELLED" && (
          <DropdownMenuItem onClick={run(() => resumeSubscription(row.id), t("toastReactivated"))}>
            <PlayCircle className="h-3.5 w-3.5 mr-2" />
            {t("actionReactivate")}
          </DropdownMenuItem>
        )}
        {row.status !== "CANCELLED" && (
          <DropdownMenuItem
            onClick={run(() => cancelSubscription(row.id), t("toastCancelled"))}
            className="text-red-600 dark:text-red-400"
          >
            <XCircle className="h-3.5 w-3.5 mr-2" />
            {t("actionCancel")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (confirm(t("confirmDelete", { name: row.name }))) {
              startTransition(async () => {
                const res = await deleteSubscription(row.id);
                if (res.ok) toast.success(t("toastDeleted"));
                else toast.error(t("deleteFailed"));
              });
            }
          }}
          className="text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          {t("actionDelete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SubscriptionsTable({ rows }: { rows: SubscriptionRow[] }) {
  const t = useTranslations("subscriptions");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "PAUSED" | "CANCELLED">("ALL");

  const filterLabel: Record<"ALL" | "ACTIVE" | "PAUSED" | "CANCELLED", string> = {
    ALL: t("filterAll"),
    ACTIVE: t("filterActive"),
    PAUSED: t("filterPaused"),
    CANCELLED: t("filterCancelled"),
  };
  const statusLabel: Record<string, string> = {
    ACTIVE: t("statusActive"),
    PAUSED: t("statusPaused"),
    CANCELLED: t("statusCancelled"),
  };

  const visible = rows.filter((r) => filter === "ALL" || r.status === filter);

  const counts = {
    ALL: rows.length,
    ACTIVE: rows.filter((r) => r.status === "ACTIVE").length,
    PAUSED: rows.filter((r) => r.status === "PAUSED").length,
    CANCELLED: rows.filter((r) => r.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {(["ALL", "ACTIVE", "PAUSED", "CANCELLED"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground border-transparent"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {filterLabel[f]}
            <span className="tabular-nums opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("colSubscription")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colCustomer")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colStatus")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("colMrr")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colRenews")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                  {rows.length === 0
                    ? t("emptyAll")
                    : t("emptyFilter")}
                </TableCell>
              </TableRow>
            )}
            {visible.map((row) => {
              const mrr =
                (row.unitPrice * row.quantity) / Math.max(row.billingPeriodMonths, 1);
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.quantity} × {fmtMoney(row.unitPrice, row.currency)} /{" "}
                      {t(`period_${row.billingPeriod}` as never)}
                      {row.product && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="font-mono text-[10px]">{row.product.sku}</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.customer ? (
                      <div className="text-sm">
                        {row.customer.company ?? row.customer.name}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "text-[10px] uppercase tracking-wider border-transparent",
                        STATUS_BADGE[row.status] ?? STATUS_BADGE.ACTIVE,
                      )}
                    >
                      {statusLabel[row.status] ?? row.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">
                    {fmtMoney(mrr, row.currency)}
                    <div className="text-[10px] text-muted-foreground font-normal">
                      {t("perMonth")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.status === "ACTIVE" && row.nextRenewalDate ? (
                      <>
                        <div>{fmtDate(row.nextRenewalDate)}</div>
                        <div className="text-[10px]">{relativeDate(row.nextRenewalDate, t)}</div>
                      </>
                    ) : row.status === "CANCELLED" && row.endDate ? (
                      <span>{t("ended", { date: fmtDate(row.endDate) })}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions row={row} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
