"use client";

import { AlertTriangle, CalendarClock, Package } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { formatQty } from "@/lib/manufacturing/stages";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import type { MoData } from "./types";

function relativeDate(
  d: Date | string | null,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return t("date.today");
  if (days === 1) return t("date.tomorrow");
  if (days === -1) return t("date.yesterday");
  if (days > 0 && days < 14) return t("date.inDays", { days });
  if (days < 0 && days > -14) return t("date.daysAgo", { days: -days });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type Props = {
  order: MoData;
  dragging?: boolean;
  onClick?: () => void;
};

export function MoCard({ order, dragging, onClick }: Props) {
  const t = useTranslations("manufacturing");
  const eta = relativeDate(order.scheduledDate, t);
  // A shortage only matters while the order hasn't been produced yet.
  const showShortage = order.shortage && order.status !== "DONE" && order.status !== "CANCELLED";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group block w-full text-left rounded-lg border bg-card p-3 transition-all",
        "hover:border-foreground/20 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-muted-foreground">{order.number}</span>
        <span className="text-sm font-semibold tabular-nums">
          {formatQty(order.quantity)} {order.product.unit}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1 text-xs text-foreground/90">
        <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{order.product.name}</span>
      </div>

      {showShortage && (
        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          {t("shortageBadge")}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        {eta ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            {eta}
          </span>
        ) : (
          <span />
        )}
        <Avatar className="h-5 w-5">
          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
            {initials(order.ownerName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </button>
  );
}
