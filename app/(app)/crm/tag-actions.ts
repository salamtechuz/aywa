"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";
import { TAG_COLORS } from "@/lib/crm/tags";

const CreateTagSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.enum(TAG_COLORS).default("slate"),
});

export async function createTag(input: z.infer<typeof CreateTagSchema>) {
  const ws = await getActiveWorkspace();
  const parsed = CreateTagSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid tag" };
  const existing = await db.tag.findFirst({
    where: { workspaceId: ws.id, name: parsed.data.name },
  });
  if (existing) return { ok: true as const, id: existing.id };
  const created = await db.tag.create({
    data: { workspaceId: ws.id, name: parsed.data.name, color: parsed.data.color },
  });
  revalidatePath("/crm");
  return { ok: true as const, id: created.id };
}

export async function assignTagToDeal(dealId: string, tagId: string) {
  const ws = await getActiveWorkspace();
  const [deal, tag] = await Promise.all([
    db.deal.findFirst({ where: { id: dealId, workspaceId: ws.id } }),
    db.tag.findFirst({ where: { id: tagId, workspaceId: ws.id } }),
  ]);
  if (!deal || !tag) return { ok: false as const, error: "Not found" };
  await db.dealTag.upsert({
    where: { dealId_tagId: { dealId, tagId } },
    create: { dealId, tagId },
    update: {},
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function removeTagFromDeal(dealId: string, tagId: string) {
  const ws = await getActiveWorkspace();
  const deal = await db.deal.findFirst({ where: { id: dealId, workspaceId: ws.id } });
  if (!deal) return { ok: false as const, error: "Not found" };
  await db.dealTag.deleteMany({ where: { dealId, tagId } });
  revalidatePath("/crm");
  return { ok: true as const };
}
