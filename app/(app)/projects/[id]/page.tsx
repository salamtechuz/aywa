import { ArrowLeft, Building2, CalendarDays, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { TaskBoard, type TaskCard } from "@/components/projects/task-board";
import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";

export const metadata = { title: "Project" };
export const dynamic = "force-dynamic";

const STATUS_KEY: Record<string, string> = {
  ACTIVE: "statusActive",
  ON_HOLD: "statusOnHold",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
};

function fmtDate(d: Date | null) {
  if (!d) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("projects");
  const ws = await getActiveWorkspace();
  const project = await db.project.findFirst({
    where: { id, workspaceId: ws.id },
    include: { customer: true, tasks: { orderBy: { position: "asc" } } },
  });
  if (!project) notFound();

  const tasks: TaskCard[] = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    assigneeName: t.assigneeName,
    dueDate: t.dueDate,
  }));

  const dueDateLabel = fmtDate(project.dueDate);

  return (
    <>
      <PageHeader
        title={project.name}
        description={
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> {t("allProjects")}
          </Link>
        }
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider capitalize">
            {t(STATUS_KEY[project.status] ?? STATUS_KEY.ACTIVE)}
          </Badge>
        }
      />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {project.customer && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {project.customer.company ?? project.customer.name}
            </span>
          )}
          {project.ownerName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {project.ownerName}
            </span>
          )}
          {dueDateLabel && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {t("due", { date: dueDateLabel })}
            </span>
          )}
        </div>

        {project.description && (
          <p className="text-sm text-muted-foreground max-w-3xl">{project.description}</p>
        )}

        <TaskBoard projectId={project.id} initialTasks={tasks} />
      </div>
    </>
  );
}
