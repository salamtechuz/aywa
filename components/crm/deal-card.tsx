"use client";

import { CalendarClock, Building2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/crm/stages";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TagChip } from "./tag-chip";

type RelativeDate =
  | { kind: "today" | "tomorrow" | "yesterday" }
  | { kind: "inDays" | "daysAgo"; days: number }
  | { kind: "date"; label: string };

export type DealCardData = {
  id: string;
  name: string;
  kind: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expectedCloseDate: Date | string | null;
  ownerName: string | null;
  contact: { name: string; company: string | null } | null;
  tags: { id: string; name: string; color: string }[];
};

function relativeDate(d: Date | string | null): RelativeDate | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };
  if (days === -1) return { kind: "yesterday" };
  if (days > 0 && days < 14) return { kind: "inDays", days };
  if (days < 0 && days > -14) return { kind: "daysAgo", days: -days };
  return {
    kind: "date",
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Props = {
  deal: DealCardData;
  dragging?: boolean;
  onClick?: () => void;
};

function useRelativeDateText() {
  const t = useTranslations("crm.relative");
  return (rel: RelativeDate | null) => {
    if (!rel) return null;
    switch (rel.kind) {
      case "today":
        return t("today");
      case "tomorrow":
        return t("tomorrow");
      case "yesterday":
        return t("yesterday");
      case "inDays":
        return t("inDays", { days: rel.days });
      case "daysAgo":
        return t("daysAgo", { days: rel.days });
      case "date":
        return rel.label;
    }
  };
}

export function DealCard({ deal, dragging, onClick }: Props) {
  const t = useTranslations("crm");
  const relativeText = useRelativeDateText();
  const closeText = relativeText(relativeDate(deal.expectedCloseDate));
  const overdue =
    deal.expectedCloseDate &&
    new Date(deal.expectedCloseDate).getTime() < Date.now() &&
    deal.stage !== "WON" &&
    deal.stage !== "LOST";
  const isLead = deal.kind === "LEAD";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group block w-full text-left rounded-lg border bg-card p-3 transition-all",
        "hover:border-foreground/20 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        dragging && "opacity-40",
        isLead && "border-dashed",
      )}
    >
      <div className="flex items-start gap-1.5">
        {isLead && (
          <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-1 py-0 shrink-0 mt-0.5">
            <Sparkles className="h-2.5 w-2.5" /> {t("leadBadge")}
          </span>
        )}
        <div className="text-sm font-medium leading-snug line-clamp-2 flex-1 min-w-0">
          {deal.name}
        </div>
      </div>

      {deal.contact && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{deal.contact.company ?? deal.contact.name}</span>
        </div>
      )}

      {deal.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deal.tags.slice(0, 3).map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} />
          ))}
          {deal.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{deal.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {formatMoney(deal.value, deal.currency)}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted">
          {deal.probability}%
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        {closeText ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              overdue ? "text-destructive font-medium" : "text-muted-foreground",
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {closeText}
          </span>
        ) : (
          <span />
        )}
        <Avatar className="h-5 w-5">
          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
            {initials(deal.ownerName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </button>
  );
}
