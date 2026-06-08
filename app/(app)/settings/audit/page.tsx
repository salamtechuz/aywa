import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  PlusCircle,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { listAuditLog } from "@/lib/audit/log";
import { getActiveWorkspace } from "@/lib/tenant";

export const metadata = { title: "Settings · Audit log" };

const ACTION_META: Record<
  string,
  { icon: typeof PlusCircle; color: string; actionKey: string }
> = {
  CREATE: { icon: PlusCircle, color: "text-emerald-600 dark:text-emerald-400", actionKey: "created" },
  UPDATE: { icon: Settings2, color: "text-sky-600 dark:text-sky-400", actionKey: "updated" },
  DELETE: { icon: Trash2, color: "text-red-600 dark:text-red-400", actionKey: "deleted" },
  STATUS_CHANGE: { icon: ArrowRight, color: "text-violet-600 dark:text-violet-400", actionKey: "moved" },
  SEND: { icon: Send, color: "text-amber-600 dark:text-amber-400", actionKey: "sent" },
  OTHER: { icon: CheckCircle2, color: "text-muted-foreground", actionKey: "action" },
};

type SettingsT = Awaited<ReturnType<typeof getTranslations<"settings">>>;

function fmtDate(d: Date, t: SettingsT) {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) return t("yesterday");
  if (days < 30) return t("daysAgo", { days });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

export default async function AuditPage() {
  const t = await getTranslations("settings");
  const ws = await getActiveWorkspace();
  const logs = await listAuditLog(ws.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          {t("auditLog")}
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            {t("auditLast", { count: logs.length })}
          </Badge>
        </CardTitle>
        <CardDescription>
          {t("auditDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            {t("noAuditEntries")}
          </p>
        ) : (
          <ol className="space-y-2">
            {logs.map((l) => {
              const meta = ACTION_META[l.action] ?? ACTION_META.OTHER;
              const Icon = meta.icon;
              return (
                <li
                  key={l.id}
                  className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5"
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0",
                      meta.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className={cn("font-semibold", meta.color)}>{t(`actions.${meta.actionKey}`)}</span>{" "}
                      <span className="text-foreground/90">{l.summary}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">
                          {initials(l.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{l.userName ?? l.userEmail ?? t("system")}</span>
                      <span>·</span>
                      <span className="font-mono">{l.entityType.toLowerCase()}</span>
                      <span>·</span>
                      <span>{fmtDate(l.createdAt, t)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
