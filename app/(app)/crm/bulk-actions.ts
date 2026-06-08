"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

const BulkStageSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  stage: z.enum(["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
});

export async function bulkUpdateDealStage(input: z.infer<typeof BulkStageSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = BulkStageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { ids, stage } = parsed.data;
  const res = await db.deal.updateMany({
    where: { workspaceId: ws.id, id: { in: ids } },
    data: { stage },
  });
  await logAudit({
    action: "STATUS_CHANGE",
    entityType: "DEAL",
    summary: `Bulk moved ${res.count} deal${res.count === 1 ? "" : "s"} to ${stage}`,
    metadata: { ids, stage },
  });
  revalidatePath("/crm");
  return { ok: true as const, count: res.count };
}

const BulkOwnerSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  ownerName: z.string(),
});

export async function bulkUpdateDealOwner(input: z.infer<typeof BulkOwnerSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = BulkOwnerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { ids, ownerName } = parsed.data;
  const trimmed = ownerName.trim() || null;
  const res = await db.deal.updateMany({
    where: { workspaceId: ws.id, id: { in: ids } },
    data: { ownerName: trimmed },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "DEAL",
    summary: `Bulk assigned ${res.count} deal${res.count === 1 ? "" : "s"} to ${trimmed ?? "(unassigned)"}`,
    metadata: { ids, ownerName: trimmed },
  });
  revalidatePath("/crm");
  return { ok: true as const, count: res.count };
}

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function bulkDeleteDeals(input: z.infer<typeof BulkDeleteSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = BulkDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const res = await db.deal.deleteMany({
    where: { workspaceId: ws.id, id: { in: parsed.data.ids } },
  });
  await logAudit({
    action: "DELETE",
    entityType: "DEAL",
    summary: `Bulk deleted ${res.count} deal${res.count === 1 ? "" : "s"}`,
    metadata: { ids: parsed.data.ids },
  });
  revalidatePath("/crm");
  return { ok: true as const, count: res.count };
}
