"use client";

import { ArrowUpRight, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DetailDrawer } from "@/components/patterns/detail-drawer";
import { ALL_STAGES, formatMoney } from "@/lib/crm/stages";
import {
  convertLead,
  deleteDeal,
  updateDeal,
} from "@/app/(app)/crm/actions";

import type { DealCardData } from "./deal-card";
import { ActivityTimeline, type ActivityItem } from "./activity-timeline";
import { TagPicker, type TagOption } from "./tag-picker";
import {
  AttachmentsPanel,
  type AttachmentItem,
} from "@/components/attachments/attachments-panel";
import { DealAiPanel } from "@/components/ai/deal-ai-panel";

type Props = {
  deal: DealCardData | null;
  contacts: { id: string; name: string; company: string | null }[];
  allTags: TagOption[];
  activitiesByDealId: Record<string, ActivityItem[]>;
  attachmentsByDealId: Record<string, AttachmentItem[]>;
  aiEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toDateInput(d: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function DealDetailDrawer({
  deal,
  contacts,
  allTags,
  activitiesByDealId,
  attachmentsByDealId,
  aiEnabled,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("crm");
  const [saving, startSave] = useTransition();
  const [converting, startConvert] = useTransition();
  const [deleting, setDeleting] = useState(false);

  if (!deal) {
    return (
      <DetailDrawer open={open} onOpenChange={onOpenChange} title="">
        <div />
      </DetailDrawer>
    );
  }

  const activities = activitiesByDealId[deal.id] ?? [];
  const attachments = attachmentsByDealId[deal.id] ?? [];
  const isLead = deal.kind === "LEAD";

  const onSubmit = (formData: FormData) => {
    formData.set("id", deal.id);
    startSave(async () => {
      const res = await updateDeal(formData);
      if (res.ok) toast.success(t("drawer.dealUpdated"));
      else toast.error(res.error);
    });
  };

  const onConvert = () => {
    startConvert(async () => {
      const res = await convertLead(deal.id);
      if (res.ok) toast.success(t("drawer.convertedToOpportunity"));
      else toast.error(res.error);
    });
  };

  const onDelete = async () => {
    if (!confirm(t("drawer.confirmDelete", { name: deal.name }))) return;
    setDeleting(true);
    const res = await deleteDeal(deal.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("drawer.dealDeleted"));
      onOpenChange(false);
    } else {
      toast.error(t("drawer.failedToDelete"));
    }
  };

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={deal.name}
      description={`${formatMoney(deal.value, deal.currency)} · ${isLead ? t("leadLower") : t(`stages.${deal.stage.toLowerCase()}`)}`}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> {t("drawer.delete")}
          </Button>
          <div className="flex items-center gap-2">
            {isLead && (
              <Button
                variant="outline"
                onClick={onConvert}
                disabled={converting}
                className="gap-1.5"
              >
                {converting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
                {t("drawer.convert")}
              </Button>
            )}
            <Button form="deal-form" type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("drawer.save")}
            </Button>
          </div>
        </div>
      }
    >
      {isLead && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {t("drawer.leadBannerTitle")}
            </p>
            <p className="text-amber-700/80 dark:text-amber-300/80 mt-0.5">
              {t("drawer.leadBannerHint")}
            </p>
          </div>
        </div>
      )}

      <div className="mb-5">
        <DealAiPanel dealId={deal.id} aiEnabled={aiEnabled} />
      </div>

      <Separator className="mb-5" />

      <div className="mb-5">
        <Label className="mb-2 inline-block">{t("drawer.tags")}</Label>
        <TagPicker dealId={deal.id} allTags={allTags} selected={deal.tags} />
      </div>

      <form id="deal-form" action={onSubmit} className="space-y-5">
        <div className="grid gap-1.5">
          <Label htmlFor="name">{t("drawer.name")}</Label>
          <Input id="name" name="name" defaultValue={deal.name} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="value">{t("drawer.valueUsd")}</Label>
            <Input
              id="value"
              name="value"
              type="number"
              step="100"
              min="0"
              defaultValue={deal.value}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="probability">{t("drawer.probability")}</Label>
            <Input
              id="probability"
              name="probability"
              type="number"
              min="0"
              max="100"
              defaultValue={deal.probability}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="stage">{t("drawer.stage")}</Label>
            <Select name="stage" defaultValue={deal.stage}>
              <SelectTrigger id="stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`stages.${s.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expectedCloseDate">{t("drawer.expectedClose")}</Label>
            <Input
              id="expectedCloseDate"
              name="expectedCloseDate"
              type="date"
              defaultValue={toDateInput(deal.expectedCloseDate)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="contactId">{t("drawer.customer")}</Label>
          <Select
            name="contactId"
            defaultValue={
              deal.contact ? findContactId(contacts, deal.contact) ?? "" : ""
            }
          >
            <SelectTrigger id="contactId">
              <SelectValue placeholder={t("drawer.noContact")} />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company ?? c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ownerName">{t("drawer.owner")}</Label>
          <Input
            id="ownerName"
            name="ownerName"
            defaultValue={deal.ownerName ?? ""}
            placeholder={t("drawer.ownerPlaceholder")}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="notes">{t("drawer.notes")}</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder={t("drawer.notesPlaceholder")}
          />
        </div>
      </form>

      <Separator className="my-6" />

      <AttachmentsPanel
        entityType="DEAL"
        entityId={deal.id}
        attachments={attachments}
      />

      <Separator className="my-6" />

      <ActivityTimeline dealId={deal.id} items={activities} />
    </DetailDrawer>
  );
}

function findContactId(
  contacts: { id: string; name: string; company: string | null }[],
  contact: { name: string; company: string | null },
): string | null {
  const match = contacts.find(
    (c) => c.name === contact.name && c.company === contact.company,
  );
  return match?.id ?? null;
}
