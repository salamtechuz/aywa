"use client";

import {
  AlertTriangle,
  Bell,
  Clock,
  CheckCheck,
  Target,
  Truck,
  Inbox as InboxIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type InboxPreviewItem = {
  id: string;
  kind:
    | "task-overdue"
    | "task-today"
    | "task-upcoming"
    | "deal-closing"
    | "deal-stale"
    | "order-overdue";
  title: string;
  subtitle: string | null;
  href: string;
  dueAt: string | null;
};

const KIND_META: Record<
  InboxPreviewItem["kind"],
  { icon: typeof Clock; color: string; label: string }
> = {
  "task-overdue": {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    label: "Overdue",
  },
  "task-today": {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    label: "Due today",
  },
  "task-upcoming": {
    icon: CheckCheck,
    color: "text-sky-600 dark:text-sky-400",
    label: "Upcoming",
  },
  "deal-closing": {
    icon: Target,
    color: "text-violet-600 dark:text-violet-400",
    label: "Closing soon",
  },
  "deal-stale": {
    icon: Clock,
    color: "text-muted-foreground",
    label: "Stale",
  },
  "order-overdue": {
    icon: Truck,
    color: "text-red-600 dark:text-red-400",
    label: "Late delivery",
  },
};

type Props = {
  preview: InboxPreviewItem[];
  total: number;
  urgentCount: number;
};

export function NotificationBell({ preview, total, urgentCount }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {urgentCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                {urgentCount > 9 ? "9+" : urgentCount}
              </span>
            )}
            {urgentCount === 0 && total > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <div className="flex items-center gap-2">
            <InboxIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Inbox</span>
            {total > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {urgentCount > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {urgentCount} urgent ·{" "}
                  </span>
                )}
                {total} total
              </span>
            )}
          </div>
          <Link
            href="/inbox"
            className="text-[11px] text-primary hover:underline font-medium"
          >
            View all
          </Link>
        </div>

        {preview.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <InboxIcon className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No overdue tasks or stale deals. Nice.
            </p>
          </div>
        ) : (
          <ul className="max-h-[360px] overflow-y-auto py-1">
            {preview.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-2.5 px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", meta.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        <span className={cn("font-medium", meta.color)}>
                          {meta.label}
                        </span>
                        {item.subtitle && <span> · {item.subtitle}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
