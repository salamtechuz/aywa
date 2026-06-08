"use client";

import { CalendarDays, Check, Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  approveTimeOff,
  createTimeOff,
  denyTimeOff,
} from "@/app/(app)/hr/actions";

export type TimeOffRow = {
  id: string;
  type: string;
  startDate: Date | string;
  endDate: Date | string;
  status: string;
  reason: string | null;
  employee: { id: string; name: string };
};

type Props = {
  requests: TimeOffRow[];
  employees: { id: string; name: string }[];
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  DENIED: "bg-red-500/15 text-red-700 dark:text-red-300",
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

function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(start: Date | string, end: Date | string) {
  const a = typeof start === "string" ? new Date(start) : start;
  const b = typeof end === "string" ? new Date(end) : end;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}

export function TimeOffPanel({ requests, employees }: Props) {
  const t = useTranslations("hr");
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await createTimeOff(formData);
      if (res.ok) {
        toast.success(t("requestFiled"));
        setShowForm(false);
      } else {
        toast.error(("error" in res && res.error) || t("failed"));
      }
    });
  };

  const onAction = (fn: () => Promise<{ ok: boolean }>, msg: string) => () => {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(msg);
      else toast.error(t("failed"));
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {t("timeOffRequests")}
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {requests.length}
          </span>
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("fileRequest")}
        </Button>
      </div>

      {showForm && (
        <form action={onSubmit} className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label htmlFor="to-employee" className="text-xs">{t("formEmployee")}</Label>
              <Select name="employeeId" required>
                <SelectTrigger id="to-employee">
                  <SelectValue placeholder={t("pick")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="to-type" className="text-xs">{t("formType")}</Label>
              <Select name="type" defaultValue="VACATION">
                <SelectTrigger id="to-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VACATION">{t("type.VACATION")}</SelectItem>
                  <SelectItem value="SICK">{t("type.SICK")}</SelectItem>
                  <SelectItem value="PERSONAL">{t("type.PERSONAL")}</SelectItem>
                  <SelectItem value="OTHER">{t("type.OTHER")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label htmlFor="to-start" className="text-xs">{t("formFrom")}</Label>
              <Input id="to-start" name="startDate" type="date" required />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="to-end" className="text-xs">{t("formTo")}</Label>
              <Input id="to-end" name="endDate" type="date" required />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="to-reason" className="text-xs">{t("formReason")}</Label>
            <Input id="to-reason" name="reason" placeholder={t("reasonPlaceholder")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("file")}
            </Button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          {t("emptyRequests")}
        </p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials(r.employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <span className="font-medium">{r.employee.name}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span>{t.has(`type.${r.type}`) ? t(`type.${r.type}`) : r.type}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtDate(r.startDate)} → {fmtDate(r.endDate)} ({t("days", { count: daysBetween(r.startDate, r.endDate) })})
                </div>
                {r.reason && (
                  <div className="text-xs text-muted-foreground mt-1 italic">{r.reason}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  className={cn(
                    "border-transparent text-[10px] uppercase tracking-wider",
                    STATUS_BADGE[r.status] ?? STATUS_BADGE.PENDING,
                  )}
                >
                  {t(`reqStatus.${r.status}`)}
                </Badge>
                {r.status === "PENDING" && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAction(() => approveTimeOff(r.id), t("approvedToast"))}
                      disabled={pending}
                      aria-label={t("approve")}
                      className="text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAction(() => denyTimeOff(r.id), t("deniedToast"))}
                      disabled={pending}
                      aria-label={t("deny")}
                      className="text-red-600 dark:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
