"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";
import { OPERATION_TYPE_IDS } from "@/lib/inventory/config";

const OperationTypeSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  type: z.enum(OPERATION_TYPE_IDS),
  code: z.string().trim().min(1, "Reference is required").max(16),
  warehouseId: z.string().optional().or(z.literal("")),
});

/** Validates an optional warehouse belongs to the workspace. Returns the id or
 *  null when empty; throws a sentinel string when the id is invalid. */
async function resolveWarehouseId(
  workspaceId: string,
  warehouseId?: string,
): Promise<string | null | "INVALID"> {
  if (!warehouseId) return null;
  const wh = await db.warehouse.findFirst({
    where: { id: warehouseId, workspaceId },
    select: { id: true },
  });
  return wh ? warehouseId : "INVALID";
}

export async function createOperationType(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = OperationTypeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const dupe = await db.operationType.findFirst({
    where: { workspaceId: ws.id, code: d.code },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Operation code ${d.code} already exists` };

  const warehouseId = await resolveWarehouseId(ws.id, d.warehouseId || undefined);
  if (warehouseId === "INVALID") return { ok: false as const, error: "Warehouse not found" };

  const created = await db.operationType.create({
    data: { workspaceId: ws.id, name: d.name, type: d.type, code: d.code, warehouseId },
  });
  await logAudit({
    action: "CREATE",
    entityType: "OPERATION_TYPE",
    entityId: created.id,
    summary: `Created operation type ${d.code} ${d.name}`,
  });
  revalidatePath("/inventory/operation-types");
  return { ok: true as const, id: created.id };
}

const UpdateOperationTypeSchema = OperationTypeSchema.extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateOperationType(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateOperationTypeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...d } = parsed.data;
  const dupe = await db.operationType.findFirst({
    where: { workspaceId: ws.id, code: d.code, NOT: { id } },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Operation code ${d.code} already exists` };

  const warehouseId = await resolveWarehouseId(ws.id, d.warehouseId || undefined);
  if (warehouseId === "INVALID") return { ok: false as const, error: "Warehouse not found" };

  await db.operationType.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      name: d.name,
      type: d.type,
      code: d.code,
      warehouseId,
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "OPERATION_TYPE",
    entityId: id,
    summary: `Updated operation type ${d.code}`,
  });
  revalidatePath("/inventory/operation-types");
  return { ok: true as const };
}

export async function deleteOperationType(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.operationType.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({
    action: "DELETE",
    entityType: "OPERATION_TYPE",
    entityId: id,
    summary: `Deleted operation type ${id}`,
  });
  revalidatePath("/inventory/operation-types");
  return { ok: true as const };
}
