import { Building2, CalendarDays, CheckCircle2, FolderKanban } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { PageHeader } from "@/components/patterns/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { listContacts } from "@/lib/crm/queries";
import { getActiveWorkspace } from "@/lib/tenant";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  ON_HOLD: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  COMPLETED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  CANCELLED: "bg-muted text-muted-foreground",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(d: Date | null) {
  if (!d) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATUS_KEY: Record<string, string> = {
  ACTIVE: "statusActive",
  ON_HOLD: "statusOnHold",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
};

export default async function ProjectsPage() {
  const t = await getTranslations("projects");
  const ws = await getActiveWorkspace();
  const [projects, contacts] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: ws.id },
      include: {
        customer: true,
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    listContacts(ws.id),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {projects.length}
          </Badge>
        }
        actions={
          <NewProjectDialog
            customers={contacts.map((c) => ({ id: c.id, name: c.name, company: c.company }))}
          />
        }
      />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FolderKanban className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">{t("emptyTitle")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("emptyDescription")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const done = p.tasks.filter((t) => t.status === "DONE").length;
              const total = p._count.tasks;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="group rounded-lg border bg-card p-4 hover:border-foreground/20 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                    <Badge
                      className={cn(
                        "border-transparent text-[10px] uppercase tracking-wider shrink-0",
                        STATUS_BADGE[p.status] ?? STATUS_BADGE.ACTIVE,
                      )}
                    >
                      {t(STATUS_KEY[p.status] ?? STATUS_KEY.ACTIVE)}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  {p.customer && (
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {p.customer.company ?? p.customer.name}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {done}/{total}
                      </span>
                      {fmtDate(p.dueDate) && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {fmtDate(p.dueDate)}
                        </span>
                      )}
                    </div>
                    {p.ownerName && (
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                          {initials(p.ownerName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  {total > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
