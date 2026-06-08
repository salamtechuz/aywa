import { Building2, CalendarDays, Mail, Phone, Users2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";
import { NewEmployeeDialog } from "@/components/hr/new-employee-dialog";
import {
  TimeOffPanel,
  type TimeOffRow,
} from "@/components/hr/time-off-panel";

export const metadata = { title: "HR" };
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  INACTIVE: "bg-muted text-muted-foreground",
  ON_LEAVE: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
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
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function HrPage() {
  const t = await getTranslations("hr");
  const ws = await getActiveWorkspace();
  const [employees, requests] = await Promise.all([
    db.employee.findMany({
      where: { workspaceId: ws.id },
      orderBy: { name: "asc" },
    }),
    db.timeOffRequest.findMany({
      where: { workspaceId: ws.id },
      include: { employee: true },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    }),
  ]);

  const departments = new Set(employees.map((e) => e.department).filter(Boolean));
  const pendingRequests = requests.filter((r) => r.status === "PENDING").length;
  const onLeave = employees.filter((e) => e.status === "ON_LEAVE").length;

  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.name }));
  const requestRows: TimeOffRow[] = requests.map((r) => ({
    id: r.id,
    type: r.type,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    reason: r.reason,
    employee: { id: r.employee.id, name: r.employee.name },
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {t("peopleCount", { count: employees.length })}
          </Badge>
        }
        actions={<NewEmployeeDialog />}
      />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("statEmployees")} value={String(employees.length)} icon={Users2} />
          <StatCard label={t("statDepartments")} value={String(departments.size)} icon={Building2} />
          <StatCard
            label={t("statOnLeave")}
            value={String(onLeave)}
            trend={onLeave > 0 ? "down" : "flat"}
            icon={CalendarDays}
          />
          <StatCard
            label={t("statPendingTimeOff")}
            value={String(pendingRequests)}
            trend={pendingRequests > 0 ? "down" : "flat"}
            hint={t("statPendingHint")}
            icon={CalendarDays}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("rosterTitle")}</CardTitle>
              <CardDescription>{t("rosterDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {t("emptyEmployees")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wider">{t("colName")}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">{t("colTitle")}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">{t("colDept")}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">{t("colStatus")}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">{t("colHired")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                                {initials(e.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{e.name}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                {e.email && (
                                  <span className="flex items-center gap-0.5">
                                    <Mail className="h-2.5 w-2.5" />
                                    {e.email}
                                  </span>
                                )}
                                {e.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="h-2.5 w-2.5" />
                                    {e.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{e.title ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {e.department ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border-transparent text-[10px] uppercase tracking-wider",
                              STATUS_BADGE[e.status] ?? STATUS_BADGE.ACTIVE,
                            )}
                          >
                            {t(`empStatus.${e.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(e.hireDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("timeOffTitle")}</CardTitle>
              <CardDescription>{t("timeOffDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <TimeOffPanel requests={requestRows} employees={employeeOptions} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
