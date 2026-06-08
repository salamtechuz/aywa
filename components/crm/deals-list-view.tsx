"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/crm/stages";

import type { DealCardData } from "./deal-card";
import { DealDetailDrawer } from "./deal-detail-drawer";
import type { ActivityItem } from "./activity-timeline";
import type { TagOption } from "./tag-picker";
import type { AttachmentItem } from "@/components/attachments/attachments-panel";
import { BulkToolbar } from "./bulk-toolbar";

const STAGE_BADGE: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  QUALIFIED: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  PROPOSAL: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  NEGOTIATION: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  WON: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  LOST: "bg-muted text-muted-foreground line-through",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DealsListView({
  deals,
  contacts,
  allTags,
  activitiesByDealId,
  attachmentsByDealId,
  aiEnabled,
}: {
  deals: DealCardData[];
  contacts: { id: string; name: string; company: string | null }[];
  allTags: TagOption[];
  activitiesByDealId: Record<string, ActivityItem[]>;
  attachmentsByDealId: Record<string, AttachmentItem[]>;
  aiEnabled: boolean;
}) {
  const t = useTranslations("crm");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const openDeal = openId ? deals.find((d) => d.id === openId) ?? null : null;

  const allVisibleIds = useMemo(() => deals.map((d) => d.id), [deals]);
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <BulkToolbar
        selectedIds={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
      />

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  aria-label={t("list.selectAll")}
                  className="h-4 w-4 rounded border-muted-foreground/40 cursor-pointer"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={toggleAll}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("list.deal")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("list.customer")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("list.stage")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("list.value")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("list.probability")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("list.close")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("list.owner")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {t("list.noMatch")}
                </TableCell>
              </TableRow>
            )}
            {deals.map((d) => {
              const selected = selectedIds.has(d.id);
              return (
                <TableRow
                  key={d.id}
                  onClick={() => setOpenId(d.id)}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    selected && "bg-primary/5",
                  )}
                >
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      aria-label={t("list.selectDeal", { name: d.name })}
                      className="h-4 w-4 rounded border-muted-foreground/40 cursor-pointer"
                      checked={selected}
                      onChange={() => toggleOne(d.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {d.contact?.company ?? d.contact?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("border-transparent", STAGE_BADGE[d.stage])}
                    >
                      {t(`stages.${d.stage.toLowerCase()}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(d.value, d.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {d.probability}%
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.expectedCloseDate
                      ? new Date(d.expectedCloseDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                          {initials(d.ownerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate">
                        {d.ownerName ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DealDetailDrawer
        deal={openDeal}
        contacts={contacts}
        allTags={allTags}
        activitiesByDealId={activitiesByDealId}
        attachmentsByDealId={attachmentsByDealId}
        aiEnabled={aiEnabled}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </>
  );
}
