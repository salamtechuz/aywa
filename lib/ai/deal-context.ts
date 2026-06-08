import "server-only";

import { db } from "@/lib/db";

export type DealContext = {
  name: string;
  kind: string;
  stage: string;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date | null;
  ownerName: string | null;
  contact: { name: string; company: string | null; email: string | null } | null;
  tags: string[];
  notes: string | null;
  activities: {
    type: string;
    title: string;
    body: string | null;
    dueAt: Date | null;
    doneAt: Date | null;
    createdAt: Date;
  }[];
};

export async function loadDealContext(
  workspaceId: string,
  dealId: string,
): Promise<DealContext | null> {
  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId },
    include: {
      contact: true,
      tags: { include: { tag: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!deal) return null;

  return {
    name: deal.name,
    kind: deal.kind,
    stage: deal.stage,
    value: deal.value,
    currency: deal.currency,
    probability: deal.probability,
    expectedCloseDate: deal.expectedCloseDate,
    ownerName: deal.ownerName,
    contact: deal.contact
      ? {
          name: deal.contact.name,
          company: deal.contact.company,
          email: deal.contact.email,
        }
      : null,
    tags: deal.tags.map((dt) => dt.tag.name),
    notes: deal.notes,
    activities: deal.activities.map((a) => ({
      type: a.type,
      title: a.title,
      body: a.body,
      dueAt: a.dueAt,
      doneAt: a.doneAt,
      createdAt: a.createdAt,
    })),
  };
}

export function formatDealForPrompt(ctx: DealContext): string {
  const lines: string[] = [];
  lines.push(`Deal: ${ctx.name}`);
  lines.push(`Kind: ${ctx.kind}`);
  lines.push(`Stage: ${ctx.stage} (probability ${ctx.probability}%)`);
  lines.push(`Value: ${ctx.value} ${ctx.currency}`);
  if (ctx.expectedCloseDate) {
    lines.push(`Expected close: ${ctx.expectedCloseDate.toISOString().slice(0, 10)}`);
  }
  if (ctx.ownerName) lines.push(`Owner: ${ctx.ownerName}`);
  if (ctx.contact) {
    const c = ctx.contact;
    lines.push(
      `Contact: ${c.name}${c.company ? " (" + c.company + ")" : ""}${c.email ? " <" + c.email + ">" : ""}`,
    );
  }
  if (ctx.tags.length > 0) lines.push(`Tags: ${ctx.tags.join(", ")}`);
  if (ctx.notes) lines.push(`Notes: ${ctx.notes}`);

  if (ctx.activities.length > 0) {
    lines.push("");
    lines.push("Recent activity (newest first):");
    for (const a of ctx.activities) {
      const dueStr = a.dueAt ? ` (due ${a.dueAt.toISOString().slice(0, 10)})` : "";
      const doneStr = a.doneAt ? " [done]" : "";
      const dateStr = a.createdAt.toISOString().slice(0, 10);
      lines.push(`- [${a.type}] ${a.title}${dueStr}${doneStr} — logged ${dateStr}`);
      if (a.body) lines.push(`    ${a.body.slice(0, 200)}`);
    }
  }
  return lines.join("\n");
}
