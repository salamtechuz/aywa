"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createTask, deleteTask, moveTask } from "@/app/(app)/projects/actions";

const STATUSES = [
  { id: "BACKLOG", labelKey: "colBacklog", accent: "var(--muted-foreground)" },
  { id: "IN_PROGRESS", labelKey: "colInProgress", accent: "var(--chart-2)" },
  { id: "REVIEW", labelKey: "colReview", accent: "var(--chart-3)" },
  { id: "DONE", labelKey: "colDone", accent: "var(--success)" },
] as const;

export type TaskCard = {
  id: string;
  title: string;
  status: string;
  assigneeName: string | null;
  dueDate: Date | string | null;
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type DueLabel = { key: string; values?: Record<string, number> } | { literal: string };

function dueLabel(d: Date | string | null): DueLabel | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return { key: "dueToday" };
  if (days === 1) return { key: "dueTomorrow" };
  if (days === -1) return { key: "dueYesterday" };
  if (days > 0 && days < 14) return { key: "dueInDays", values: { count: days } };
  if (days < 0 && days > -14) return { key: "dueDaysAgo", values: { count: -days } };
  return { literal: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
}

function SortableTask({ task }: { task: TaskCard }) {
  const t = useTranslations("projects");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });
  const [pending, startTransition] = useTransition();
  const overdue =
    task.dueDate &&
    new Date(task.dueDate).getTime() < Date.now() &&
    task.status !== "DONE";
  const due = dueLabel(task.dueDate);
  const dueText = due ? ("literal" in due ? due.literal : t(due.key, due.values)) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none rounded-lg border bg-card p-2.5 transition-all hover:border-foreground/20",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{task.title}</div>
          <div className="mt-1.5 flex items-center justify-between">
            {task.dueDate ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  overdue ? "text-destructive font-medium" : "text-muted-foreground",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {dueText}
              </span>
            ) : (
              <span />
            )}
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                {initials(task.assigneeName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!confirm(t("deleteConfirm", { title: task.title }))) return;
            startTransition(async () => {
              const res = await deleteTask(task.id);
              if (!res.ok) toast.error(t("failed"));
            });
          }}
          disabled={pending}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
          aria-label={t("deleteTask")}
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

function Column({
  status,
  label,
  accent,
  tasks,
  projectId,
}: {
  status: string;
  label: string;
  accent: string;
  tasks: TaskCard[];
  projectId: string;
}) {
  const t = useTranslations("projects");
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, data: { status } });
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("title", title.trim());
    fd.set("status", status);
    startTransition(async () => {
      const res = await createTask(fd);
      if (res.ok) {
        toast.success(t("taskAdded"));
        setTitle("");
        setAddOpen(false);
      } else {
        toast.error(("error" in res && res.error) || t("failed"));
      }
    });
  };

  return (
    <div className="flex flex-col w-[85vw] sm:w-[280px] sm:min-w-[280px] shrink-0 snap-start sm:snap-align-none">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0 bg-card"
        style={{ borderTopColor: accent, borderTopWidth: 2 }}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: accent }} aria-hidden />
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground">{tasks.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAddOpen((v) => !v)}
          className="h-6 w-6"
          aria-label={t("addTask")}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 min-h-[160px] rounded-b-lg border border-t-0 bg-muted/30 p-2 space-y-2 transition-colors group",
            isOver && "bg-primary/5",
          )}
        >
          {addOpen && (
            <form onSubmit={onAdd} className="rounded-lg border bg-card p-2 space-y-2">
              <Input
                placeholder={t("taskTitlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className="h-8 text-sm"
              />
              <div className="flex gap-1">
                <Button type="submit" size="sm" disabled={pending || !title.trim()} className="flex-1">
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("add")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddOpen(false);
                    setTitle("");
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          )}
          {tasks.length === 0 && !addOpen && (
            <div className="text-[11px] text-muted-foreground text-center py-6 select-none">
              {t("dropTaskHere")}
            </div>
          )}
          {tasks.map((t) => (
            <SortableTask key={t.id} task={t} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function TaskBoard({
  projectId,
  initialTasks,
}: {
  projectId: string;
  initialTasks: TaskCard[];
}) {
  const t = useTranslations("projects");
  const [tasks, setTasks] = useState<TaskCard[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, TaskCard[]>();
    for (const s of STATUSES) map.set(s.id, []);
    for (const t of tasks) {
      if (map.has(t.status)) map.get(t.status)!.push(t);
    }
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeTaskNow = tasks.find((t) => t.id === active.id);
    if (!activeTaskNow) return;

    let targetStatus: string;
    let targetIndex: number;

    if (String(over.id).startsWith("col:")) {
      targetStatus = String(over.id).slice("col:".length);
      const inStatus = tasks.filter((t) => t.status === targetStatus && t.id !== active.id);
      targetIndex = inStatus.length;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      targetStatus = overTask.status;
      const inStatus = tasks.filter((t) => t.status === targetStatus);
      const overIdx = inStatus.findIndex((t) => t.id === over.id);
      targetIndex = overIdx === -1 ? inStatus.length : overIdx;
    }

    const sourceStatus = activeTaskNow.status;
    const sourceInStatus = tasks.filter((t) => t.status === sourceStatus);
    const sourceIdx = sourceInStatus.findIndex((t) => t.id === active.id);
    if (sourceStatus === targetStatus && sourceIdx === targetIndex) return;

    setTasks((prev) => {
      const others = prev.filter((t) => t.id !== active.id);
      const updated = { ...activeTaskNow, status: targetStatus };
      const inTarget = others.filter((t) => t.status === targetStatus);
      const before = inTarget.slice(0, targetIndex);
      const after = inTarget.slice(targetIndex);
      const notInTarget = others.filter((t) => t.status !== targetStatus);

      if (sourceStatus === targetStatus) {
        const reordered = arrayMove(
          prev.filter((t) => t.status === sourceStatus),
          sourceIdx,
          targetIndex,
        );
        const otherCols = prev.filter((t) => t.status !== sourceStatus);
        return [...otherCols, ...reordered];
      }
      return [...notInTarget, ...before, updated, ...after];
    });

    startTransition(async () => {
      await moveTask({
        taskId: String(active.id),
        status: targetStatus as "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE",
        position: targetIndex,
      });
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4 snap-x snap-mandatory sm:snap-none -mx-4 sm:mx-0 px-4 sm:px-0">
        {STATUSES.map((s) => (
          <Column
            key={s.id}
            status={s.id}
            label={t(s.labelKey)}
            accent={s.accent}
            tasks={grouped.get(s.id) ?? []}
            projectId={projectId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="w-[264px] rotate-2 shadow-xl">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="text-sm font-medium">{activeTask.title}</div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
