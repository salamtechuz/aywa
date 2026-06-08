"use client";

import { Archive, Kanban, Rows3, Search, Sparkles, Tag as TagIcon, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/crm/stages";
import { TAG_SWATCH_CLASS, safeTagColor } from "@/lib/crm/tags";

import type { DealCardData } from "./deal-card";
import { PipelineBoard } from "./pipeline-board";
import { PipelineStats } from "./pipeline-stats";
import { DealsListView } from "./deals-list-view";
import type { ActivityItem } from "./activity-timeline";
import type { TagOption } from "./tag-picker";
import type { AttachmentItem } from "@/components/attachments/attachments-panel";

type View = "kanban" | "list" | "leads" | "lost";

type Props = {
  initialDeals: DealCardData[];
  contacts: { id: string; name: string; company: string | null }[];
  allTags: TagOption[];
  activitiesByDealId: Record<string, ActivityItem[]>;
  attachmentsByDealId: Record<string, AttachmentItem[]>;
  aiEnabled: boolean;
};

export function PipelineShell({
  initialDeals,
  contacts,
  allTags,
  activitiesByDealId,
  attachmentsByDealId,
  aiEnabled,
}: Props) {
  const t = useTranslations("crm");
  const [view, setView] = useState<View>("kanban");
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState<string>("ALL");
  const [tagId, setTagId] = useState<string>("ALL");

  const owners = useMemo(() => {
    const set = new Set<string>();
    initialDeals.forEach((d) => d.ownerName && set.add(d.ownerName));
    return [...set].sort();
  }, [initialDeals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialDeals.filter((d) => {
      if (owner !== "ALL" && d.ownerName !== owner) return false;
      if (tagId !== "ALL" && !d.tags.some((t) => t.id === tagId)) return false;
      if (q) {
        const hay = `${d.name} ${d.contact?.company ?? ""} ${d.contact?.name ?? ""} ${d.tags
          .map((t) => t.name)
          .join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialDeals, query, owner, tagId]);

  const opportunities = filtered.filter((d) => d.kind === "OPPORTUNITY" && d.stage !== "LOST");
  const leads = filtered.filter((d) => d.kind === "LEAD");
  const lost = filtered.filter((d) => d.stage === "LOST");

  return (
    <>
      <PipelineStats deals={filtered.filter((d) => d.kind === "OPPORTUNITY")} />

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("searchDeals")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={owner} onValueChange={(v) => setOwner(v ?? "ALL")}>
          <SelectTrigger className="w-[160px]">
            <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allOwners")}</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tagId} onValueChange={(v) => setTagId(v ?? "ALL")}>
          <SelectTrigger className="w-[160px]">
            <TagIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allTags")}</SelectItem>
            {allTags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      TAG_SWATCH_CLASS[safeTagColor(t.color)],
                    )}
                    aria-hidden
                  />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5">
              <Kanban className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("viewKanban")}</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <Rows3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("viewList")}</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("viewLeads")}</span>
              {leads.length > 0 && (
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] font-mono">
                  {leads.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="lost" className="gap-1.5">
              <Archive className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("viewLost")}</span>
              {lost.length > 0 && (
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] font-mono">
                  {lost.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "kanban" && (
        <PipelineBoard
          initialDeals={opportunities}
          contacts={contacts}
          allTags={allTags}
          activitiesByDealId={activitiesByDealId}
          attachmentsByDealId={attachmentsByDealId}
          aiEnabled={aiEnabled}
        />
      )}

      {view === "list" && (
        <DealsListView
          deals={opportunities}
          contacts={contacts}
          allTags={allTags}
          activitiesByDealId={activitiesByDealId}
          attachmentsByDealId={attachmentsByDealId}
          aiEnabled={aiEnabled}
        />
      )}

      {view === "leads" && (
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
              <Sparkles className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">{t("noLeads")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("noLeadsHint")}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t("leadsSummary", {
                  count: leads.length,
                  value: formatMoney(leads.reduce((s, d) => s + d.value, 0)),
                })}
              </p>
              <DealsListView
                deals={leads}
                contacts={contacts}
                allTags={allTags}
                activitiesByDealId={activitiesByDealId}
                attachmentsByDealId={attachmentsByDealId}
                aiEnabled={aiEnabled}
              />
            </>
          )}
        </div>
      )}

      {view === "lost" && (
        <div className="space-y-3">
          {lost.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
              <Archive className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">{t("noLost")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("noLostHint")}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t("lostSummary", {
                  count: lost.length,
                  value: formatMoney(lost.reduce((s, d) => s + d.value, 0)),
                })}
              </p>
              <DealsListView
                deals={lost}
                contacts={contacts}
                allTags={allTags}
                activitiesByDealId={activitiesByDealId}
                attachmentsByDealId={attachmentsByDealId}
                aiEnabled={aiEnabled}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
