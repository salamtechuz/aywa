import {
  AlertTriangle,
  CheckCheck,
  Clock,
  Inbox as InboxIcon,
  Target,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { loadInbox, type InboxItem, type InboxItemKind } from "@/lib/inbox/queries";
import { getActiveWorkspace } from "@/lib/tenant";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

const KIND_META: Record<
  InboxItemKind,
  { icon: typeof Clock; color: string; bg: string; labelKey: string }
> = {
  "task-overdue": {
    icon: AlertTriangle,
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-500/10 border-red-500/30",
    labelKey: "kinds.taskOverdue",
  },
  "task-today": {
    icon: Clock,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-500/30",
    labelKey: "kinds.taskToday",
  },
  "task-upcoming": {
    icon: CheckCheck,
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10 border-sky-500/30",
    labelKey: "kinds.taskUpcoming",
  },
  "deal-closing": {
    icon: Target,
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500/10 border-violet-500/30",
    labelKey: "kinds.dealClosing",
  },
  "deal-stale": {
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted/40 border-border",
    labelKey: "kinds.dealStale",
  },
  "order-overdue": {
    icon: Truck,
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-500/10 border-red-500/30",
    labelKey: "kinds.orderOverdue",
  },
};

const SECTION_ORDER: {
  titleKey: string;
  kinds: InboxItemKind[];
  descriptionKey: string;
}[] = [
  {
    titleKey: "sections.now.title",
    kinds: ["task-overdue", "order-overdue", "task-today"],
    descriptionKey: "sections.now.description",
  },
  {
    titleKey: "sections.thisWeek.title",
    kinds: ["deal-closing", "task-upcoming"],
    descriptionKey: "sections.thisWeek.description",
  },
  {
    titleKey: "sections.needsAttention.title",
    kinds: ["deal-stale"],
    descriptionKey: "sections.needsAttention.description",
  },
];

function fmtMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDue(
  d: Date | null,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (!d) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return t("relative.today");
  if (days === 1) return t("relative.tomorrow");
  if (days === -1) return t("relative.yesterday");
  if (days < 0) return t("relative.daysAgo", { days: -days });
  if (days < 7) return t("relative.inDays", { days });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function InboxPage() {
  const t = await getTranslations("inbox");
  const ws = await getActiveWorkspace();
  const items = await loadInbox(ws.id);

  const byKind = new Map<InboxItemKind, InboxItem[]>();
  for (const i of items) {
    const arr = byKind.get(i.kind) ?? [];
    arr.push(i);
    byKind.set(i.kind, arr);
  }

  const urgentCount = (byKind.get("task-overdue")?.length ?? 0) +
    (byKind.get("order-overdue")?.length ?? 0) +
    (byKind.get("task-today")?.length ?? 0);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          urgentCount > 0 ? (
            <Badge className="ml-1 bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[10px] uppercase tracking-wider">
              {t("urgentBadge", { count: urgentCount })}
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
              {t("allCaughtUp")}
            </Badge>
          )
        }
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-5">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <InboxIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-base font-medium">{t("empty.title")}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {t("empty.description")}
              </p>
            </CardContent>
          </Card>
        ) : (
          SECTION_ORDER.map((section) => {
            const sectionItems = section.kinds.flatMap(
              (k) => byKind.get(k) ?? [],
            );
            if (sectionItems.length === 0) return null;
            return (
              <Card key={section.titleKey}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {t(section.titleKey)}
                    <span className="text-xs text-muted-foreground tabular-nums font-normal">
                      {sectionItems.length}
                    </span>
                  </CardTitle>
                  <CardDescription>{t(section.descriptionKey)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {sectionItems.map((item) => {
                    const meta = KIND_META[item.kind];
                    const Icon = meta.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:brightness-110",
                          meta.bg,
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", meta.color)} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            <span className={cn("font-medium", meta.color)}>
                              {t(meta.labelKey)}
                            </span>
                            {item.subtitle && <span> · {item.subtitle}</span>}
                            {item.ownerName && (
                              <span> · {item.ownerName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                          {item.amount !== null && (
                            <span className="font-semibold tabular-nums">
                              {fmtMoney(item.amount, item.currency ?? "USD")}
                            </span>
                          )}
                          {item.dueAt && (
                            <span className="text-muted-foreground tabular-nums">
                              {fmtDue(item.dueAt, t)}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
