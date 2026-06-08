import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import {
  listActivitiesForDeal,
  listContacts,
  listDeals,
  listTags,
} from "@/lib/crm/queries";
import { getActiveWorkspace } from "@/lib/tenant";
import { db } from "@/lib/db";
import { isAiEnabled } from "@/lib/ai/client";
import { PipelineShell } from "@/components/crm/pipeline-shell";
import { NewDealDialog } from "@/components/crm/new-deal-dialog";
import type { DealCardData } from "@/components/crm/deal-card";
import type { ActivityItem } from "@/components/crm/activity-timeline";
import type { AttachmentItem } from "@/components/attachments/attachments-panel";

export const metadata = { title: "CRM · Pipeline" };

export default async function CrmPipelinePage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("crm");
  const [deals, contacts, tags] = await Promise.all([
    listDeals(ws.id),
    listContacts(ws.id),
    listTags(ws.id),
  ]);

  // Batch fetch activities for all deals.
  const activitiesByDealId: Record<string, ActivityItem[]> = {};
  await Promise.all(
    deals.map(async (d) => {
      const list = await listActivitiesForDeal(ws.id, d.id);
      activitiesByDealId[d.id] = list.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        body: a.body,
        dueAt: a.dueAt,
        doneAt: a.doneAt,
        ownerName: a.ownerName,
        createdAt: a.createdAt,
      }));
    }),
  );

  // Batch fetch attachments for all deals in this workspace in one query.
  const allDealAttachments = await db.attachment.findMany({
    where: {
      workspaceId: ws.id,
      entityType: "DEAL",
      entityId: { in: deals.map((d) => d.id) },
    },
    orderBy: { createdAt: "desc" },
  });
  const attachmentsByDealId: Record<string, AttachmentItem[]> = {};
  for (const att of allDealAttachments) {
    const arr = attachmentsByDealId[att.entityId] ?? [];
    arr.push({
      id: att.id,
      filename: att.filename,
      storageKey: att.storageKey,
      mimeType: att.mimeType,
      size: att.size,
      uploadedBy: att.uploadedBy,
      createdAt: att.createdAt,
    });
    attachmentsByDealId[att.entityId] = arr;
  }

  const cards: DealCardData[] = deals.map((d) => ({
    id: d.id,
    name: d.name,
    kind: d.kind,
    value: d.value,
    currency: d.currency,
    stage: d.stage,
    probability: d.probability,
    expectedCloseDate: d.expectedCloseDate,
    ownerName: d.ownerName,
    contact: d.contact
      ? { name: d.contact.name, company: d.contact.company }
      : null,
    tags: d.tags.map((dt) => ({
      id: dt.tag.id,
      name: dt.tag.name,
      color: dt.tag.color,
    })),
  }));

  const contactOptions = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
  }));

  const tagOptions = tags.map((t) => ({ id: t.id, name: t.name, color: t.color }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            CRM
          </Badge>
        }
        actions={<NewDealDialog contacts={contactOptions} />}
      />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <PipelineShell
          initialDeals={cards}
          contacts={contactOptions}
          allTags={tagOptions}
          activitiesByDealId={activitiesByDealId}
          attachmentsByDealId={attachmentsByDealId}
          aiEnabled={isAiEnabled()}
        />
      </div>
    </>
  );
}
