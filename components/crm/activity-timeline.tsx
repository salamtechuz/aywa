"use client";

import {
  Calendar,
  CheckCircle2,
  Circle,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  createActivity,
  deleteActivity,
  toggleActivityDone,
} from "@/app/(app)/crm/activity-actions";

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  dueAt: Date | string | null;
  doneAt: Date | string | null;
  ownerName: string | null;
  createdAt: Date | string;
};

const TYPE_ICON: Record<string, LucideIcon> = {
  NOTE: MessageSquare,
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  TASK: CheckCircle2,
};

const TYPE_COLOR: Record<string, string> = {
  NOTE: "text-slate-500 bg-slate-500/10",
  CALL: "text-emerald-600 bg-emerald-500/10",
  EMAIL: "text-blue-600 bg-blue-500/10",
  MEETING: "text-violet-600 bg-violet-500/10",
  TASK: "text-amber-600 bg-amber-500/10",
};

type RelativeDate =
  | { kind: "today" | "tomorrow" | "yesterday" }
  | { kind: "inDays" | "daysAgo"; days: number }
  | { kind: "date"; label: string };

function relativeOrDate(d: Date | string | null): RelativeDate | null {
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

function useTypeLabel() {
  const t = useTranslations("crm.activity.types");
  return (type: string) => {
    switch (type) {
      case "NOTE":
        return t("note");
      case "CALL":
        return t("call");
      case "EMAIL":
        return t("email");
      case "MEETING":
        return t("meeting");
      case "TASK":
        return t("task");
      default:
        return type;
    }
  };
}

type Props = {
  dealId: string;
  items: ActivityItem[];
};

export function ActivityTimeline({ dealId, items }: Props) {
  const t = useTranslations("crm.activity");
  const [tab, setTab] = useState<"log" | "schedule">("log");

  const sorted = [...items].sort((a, b) => {
    const aTime = new Date(a.dueAt ?? a.doneAt ?? a.createdAt).getTime();
    const bTime = new Date(b.dueAt ?? b.doneAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });
  const upcoming = sorted.filter((a) => a.dueAt && !a.doneAt);
  const past = sorted.filter((a) => a.doneAt);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          <span className="text-xs text-muted-foreground">
            {t("summary", { logged: past.length, upcoming: upcoming.length })}
          </span>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "log" | "schedule")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="log">{t("logActivity")}</TabsTrigger>
            <TabsTrigger value="schedule">{t("schedule")}</TabsTrigger>
          </TabsList>
          <TabsContent value="log" className="mt-3">
            <LogActivityForm dealId={dealId} />
          </TabsContent>
          <TabsContent value="schedule" className="mt-3">
            <ScheduleActivityForm dealId={dealId} />
          </TabsContent>
        </Tabs>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("upcoming")}
          </div>
          {upcoming.map((a) => (
            <TimelineRow key={a.id} item={a} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("history")}
          </div>
          {past.map((a) => (
            <TimelineRow key={a.id} item={a} />
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t("empty")}
        </p>
      )}
    </div>
  );
}

function TimelineRow({ item }: { item: ActivityItem }) {
  const t = useTranslations("crm.activity");
  const relativeText = useRelativeDateText();
  const typeLabel = useTypeLabel();
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();
  const Icon = TYPE_ICON[item.type] ?? MessageSquare;
  const isTask = item.type === "TASK" || item.type === "MEETING";
  const done = !!item.doneAt;
  const overdue =
    !done && item.dueAt && new Date(item.dueAt).getTime() < Date.now();

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border bg-card p-2.5 transition-colors",
        done && "opacity-70",
      )}
    >
      {isTask ? (
        <button
          type="button"
          onClick={() =>
            startToggle(async () => {
              await toggleActivityDone(item.id);
              toast.success(done ? t("markedNotDone") : t("markedDone"));
            })
          }
          disabled={toggling}
          className="mt-0.5 shrink-0"
          aria-label={done ? t("markNotDone") : t("markDone")}
        >
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          )}
        </button>
      ) : (
        <div
          className={cn(
            "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
            TYPE_COLOR[item.type] ?? TYPE_COLOR.NOTE,
          )}
        >
          <Icon className="h-3 w-3" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={cn("text-sm font-medium", done && "line-through")}>
            {item.title}
          </span>
          <button
            type="button"
            onClick={() =>
              startDelete(async () => {
                await deleteActivity(item.id);
                toast.success(t("activityRemoved"));
              })
            }
            disabled={deleting}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            aria-label={t("deleteActivity")}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        {item.body && (
          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
            {item.body}
          </p>
        )}
        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
          <span>{typeLabel(item.type)}</span>
          {(item.dueAt || item.doneAt) && (
            <>
              <span>·</span>
              <span className={cn(overdue && "text-destructive font-medium")}>
                {relativeText(relativeOrDate(item.dueAt ?? item.doneAt))}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LogActivityForm({ dealId }: { dealId: string }) {
  const t = useTranslations("crm.activity");
  const typeLabel = useTypeLabel();
  const [type, setType] = useState<"NOTE" | "CALL" | "EMAIL">("NOTE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, startSave] = useTransition();

  const submit = () => {
    if (!title.trim()) {
      toast.error(t("addTitle"));
      return;
    }
    startSave(async () => {
      const res = await createActivity({ dealId, type, title, body });
      if (res.ok) {
        toast.success(t("logged"));
        setTitle("");
        setBody("");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(["NOTE", "CALL", "EMAIL"] as const).map((kind) => {
          const Icon = TYPE_ICON[kind];
          return (
            <Button
              key={kind}
              type="button"
              variant={type === kind ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setType(kind)}
            >
              <Icon className="h-3.5 w-3.5" />
              {typeLabel(kind)}
            </Button>
          );
        })}
      </div>
      <Input
        placeholder={
          type === "NOTE"
            ? t("quickNotePlaceholder")
            : t("summaryPlaceholder", { type: typeLabel(type) })
        }
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        rows={2}
        placeholder={t("detailsPlaceholder")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button onClick={submit} disabled={saving} size="sm" className="w-full">
        {saving ? t("logging") : t("logType", { type: typeLabel(type).toLowerCase() })}
      </Button>
    </div>
  );
}

function ScheduleActivityForm({ dealId }: { dealId: string }) {
  const t = useTranslations("crm.activity");
  const typeLabel = useTypeLabel();
  const [type, setType] = useState<"TASK" | "MEETING">("TASK");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, startSave] = useTransition();

  const submit = () => {
    if (!title.trim()) {
      toast.error(t("addTitle"));
      return;
    }
    if (!dueAt) {
      toast.error(t("pickDueDate"));
      return;
    }
    startSave(async () => {
      const res = await createActivity({ dealId, type, title, body, dueAt });
      if (res.ok) {
        toast.success(t("scheduled"));
        setTitle("");
        setBody("");
        setDueAt("");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(["TASK", "MEETING"] as const).map((kind) => {
          const Icon = TYPE_ICON[kind];
          return (
            <Button
              key={kind}
              type="button"
              variant={type === kind ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setType(kind)}
            >
              <Icon className="h-3.5 w-3.5" />
              {typeLabel(kind)}
            </Button>
          );
        })}
      </div>
      <Input
        placeholder={t("titlePlaceholder", { type: typeLabel(type) })}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
        <Button onClick={submit} disabled={saving} size="sm" className="px-4">
          {saving ? "…" : t("schedule")}
        </Button>
      </div>
      <Textarea
        rows={2}
        placeholder={t("detailsPlaceholder")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
    </div>
  );
}
