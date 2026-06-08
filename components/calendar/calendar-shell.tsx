"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  DollarSign,
  Target,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEventKind } from "@/lib/calendar/queries";

type SerializedEvent = {
  id: string;
  kind: CalendarEventKind;
  date: string;
  title: string;
  subtitle?: string;
  href: string;
  overdue?: boolean;
  amount?: number;
  currency?: string;
};

type Props = {
  month: string; // ISO date string, first of cursor month
  events: SerializedEvent[];
};

const KIND_META: Record<
  CalendarEventKind,
  { color: string; bg: string; ring: string; icon: typeof Clock }
> = {
  "activity-due": {
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/15",
    ring: "ring-sky-500/30",
    icon: Clock,
  },
  "activity-done": {
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-500/30",
    icon: CircleCheck,
  },
  "deal-close": {
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500/15",
    ring: "ring-violet-500/30",
    icon: Target,
  },
  "order-delivery": {
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/15",
    ring: "ring-amber-500/30",
    icon: Truck,
  },
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  // Monday as week start (Odoo + most ERPs use ISO weeks).
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CalendarShell({ month, events }: Props) {
  const router = useRouter();
  const t = useTranslations("calendar");
  const cursor = useMemo(() => new Date(month), [month]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState<"month" | "agenda">("month");
  const [activeKinds, setActiveKinds] = useState<Set<CalendarEventKind>>(
    () => new Set(["activity-due", "activity-done", "deal-close", "order-delivery"]),
  );

  const filteredEvents = useMemo(
    () => events.filter((e) => activeKinds.has(e.kind)),
    [events, activeKinds],
  );

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() });
    }
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, SerializedEvent[]>();
    for (const e of filteredEvents) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return m;
  }, [filteredEvents]);

  const agendaEvents = useMemo(() => {
    // Upcoming first, then past in compact strip.
    return [...filteredEvents].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [filteredEvents]);

  const monthNames = t.raw("months") as string[];
  const monthLabel = t("monthYear", {
    month: monthNames[cursor.getMonth()],
    year: cursor.getFullYear(),
  });

  function nav(deltaMonths: number) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + deltaMonths, 1);
    router.push(`/calendar?month=${monthKey(next)}`);
  }

  function gotoToday() {
    const now = new Date();
    router.push(`/calendar?month=${monthKey(now)}`);
  }

  function toggleKind(k: CalendarEventKind) {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  // Monday-first short weekday names, localized (en/ru/uz) — Intl has no `uz`
  // data in this runtime, so we read our own names from messages.
  const weekdayLabels = t.raw("weekdaysShort") as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => nav(-1)} aria-label={t("prevMonth")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={gotoToday}>
            {t("today")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav(1)} aria-label={t("nextMonth")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold capitalize">{monthLabel}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setView("month")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-sm transition-colors",
                view === "month"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("viewMonth")}
            </button>
            <button
              type="button"
              onClick={() => setView("agenda")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-sm transition-colors",
                view === "agenda"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("viewAgenda")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(KIND_META) as CalendarEventKind[]).map((kind) => {
          const meta = KIND_META[kind];
          const Icon = meta.icon;
          const active = activeKinds.has(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? `${meta.bg} ${meta.color} border-transparent`
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`kind.${kind}`)}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {t("eventCount", { count: filteredEvents.length })}
        </span>
      </div>

      {view === "month" ? (
        <MonthGrid
          grid={grid}
          today={today}
          eventsByDay={eventsByDay}
          weekdayLabels={weekdayLabels}
          emptyLabel={t("noEvents")}
        />
      ) : (
        <AgendaList
          events={agendaEvents}
          today={today}
          emptyLabel={t("noEventsAgenda")}
        />
      )}
    </div>
  );
}

function MonthGrid({
  grid,
  today,
  eventsByDay,
  weekdayLabels,
  emptyLabel,
}: {
  grid: { date: Date; inMonth: boolean }[];
  today: Date;
  eventsByDay: Map<string, SerializedEvent[]>;
  weekdayLabels: string[];
  emptyLabel: string;
}) {
  const t = useTranslations("calendar");
  // Inline grid-template-columns guarantees the 7-column layout regardless of
  // whether Tailwind's `grid-cols-7` utility makes it through the JIT in this
  // build. Each cell has min-height so events have vertical room to land in.
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  } as const;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div style={gridStyle} className="bg-muted/40 border-b">
        {weekdayLabels.map((w, idx) => (
          <div
            key={w}
            className={cn(
              "px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center",
              idx < 6 && "border-r",
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div style={gridStyle}>
        {grid.map(({ date, inMonth }, i) => {
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = isSameDay(date, today);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          const isLastCol = (i + 1) % 7 === 0;
          const isLastRow = i >= 35;
          const isWeekend = i % 7 === 5 || i % 7 === 6;

          return (
            <div
              key={i}
              className={cn(
                "relative min-h-[7rem] p-1.5 flex flex-col gap-1 overflow-hidden",
                !isLastCol && "border-r",
                !isLastRow && "border-b",
                !inMonth && "bg-muted/30",
                inMonth && isWeekend && "bg-muted/10",
                isToday && "bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1 rounded-full text-xs font-semibold tabular-nums shrink-0",
                    isToday && "bg-primary text-primary-foreground",
                    !isToday && !inMonth && "text-muted-foreground/50",
                    !isToday && inMonth && "text-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums leading-none mt-1">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-[3px] min-w-0">
                {visible.map((e) => (
                  <EventPill key={e.id} event={e} compact />
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] text-muted-foreground/80 px-1 font-medium">
                    {t("more", { count: overflow })}
                  </span>
                )}
              </div>

              {dayEvents.length === 0 && isToday && (
                <span className="text-[10px] text-muted-foreground italic mt-auto">
                  {emptyLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaList({
  events,
  today,
  emptyLabel,
}: {
  events: SerializedEvent[];
  today: Date;
  emptyLabel: string;
}) {
  const t = useTranslations("calendar");
  const weekdaysShort = t.raw("weekdaysShort") as string[];
  const monthsShort = t.raw("monthsShort") as string[];
  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  const groups = new Map<string, SerializedEvent[]>();
  for (const e of events) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }

  return (
    <div className="rounded-lg border bg-card divide-y">
      {Array.from(groups.entries()).map(([key, dayEvents]) => {
        const sample = new Date(dayEvents[0].date);
        const isToday = isSameDay(sample, today);
        const label = t("agendaDate", {
          weekday: weekdaysShort[(sample.getDay() + 6) % 7],
          day: sample.getDate(),
          month: monthsShort[sample.getMonth()],
        });
        return (
          <div key={key} className="grid grid-cols-[8rem_1fr] gap-4 p-4">
            <div className="text-sm">
              <div
                className={cn(
                  "font-medium capitalize",
                  isToday ? "text-primary" : "text-foreground",
                )}
              >
                {label}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("eventsShort", { count: dayEvents.length })}
              </div>
            </div>
            <div className="space-y-1">
              {dayEvents.map((e) => (
                <EventPill key={e.id} event={e} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventPill({
  event,
  compact = false,
}: {
  event: SerializedEvent;
  compact?: boolean;
}) {
  const meta = KIND_META[event.kind];
  const Icon = meta.icon;

  if (compact) {
    // Compact = inside a month-grid cell. Single line, very narrow, just dot +
    // truncated title. Detailed info shows on hover via title attr.
    return (
      <Link
        href={event.href}
        title={`${event.title}${event.subtitle ? " · " + event.subtitle : ""}`}
        className={cn(
          "group flex items-center gap-1 rounded px-1 py-[2px] text-[11px] leading-tight transition-colors hover:brightness-110 min-w-0",
          meta.bg,
          meta.color,
          event.overdue && "ring-1 ring-red-500/40",
        )}
      >
        <Icon className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate font-medium">{event.title}</span>
      </Link>
    );
  }

  return (
    <Link
      href={event.href}
      title={`${event.title}${event.subtitle ? " · " + event.subtitle : ""}`}
      className={cn(
        "group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:brightness-110",
        meta.bg,
        meta.color,
        event.overdue ? "ring-1 ring-red-500/40" : `ring-1 ${meta.ring}`,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate font-medium">{event.title}</span>
      {event.subtitle && (
        <span className="text-muted-foreground truncate font-normal hidden sm:inline">
          · {event.subtitle}
        </span>
      )}
      {event.amount !== undefined && event.amount > 0 && (
        <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] tabular-nums text-foreground/80 shrink-0">
          <DollarSign className="h-3 w-3" />
          {Math.round(event.amount).toLocaleString()}
        </span>
      )}
    </Link>
  );
}
