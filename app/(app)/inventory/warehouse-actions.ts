"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

const WarehouseSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(12),
  name: z.string().trim().min(2, "Name is required").max(120),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function createWarehouse(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = WarehouseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const dupe = await db.warehouse.findFirst({
    where: { workspaceId: ws.id, code: d.code },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Warehouse code ${d.code} already exists` };

  const created = await db.warehouse.create({
    data: { workspaceId: ws.id, code: d.code, name: d.name, address: d.address || null },
  });
  await logAudit({
    action: "CREATE",
    entityType: "WAREHOUSE",
    entityId: created.id,
    summary: `Created warehouse ${d.code} ${d.name}`,
  });
  revalidatePath("/inventory/warehouses");
  return { ok: true as const, id: created.id };
}

const UpdateWarehouseSchema = WarehouseSchema.extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateWarehouse(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateWarehouseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...d } = parsed.data;
  const dupe = await db.warehouse.findFirst({
    where: { workspaceId: ws.id, code: d.code, NOT: { id } },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Warehouse code ${d.code} already exists` };

  await db.warehouse.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      code: d.code,
      name: d.name,
      address: d.address || null,
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "WAREHOUSE",
    entityId: id,
    summary: `Updated warehouse ${d.code}`,
  });
  revalidatePath("/inventory/warehouses");
  return { ok: true as const };
}

export async function deleteWarehouse(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const [locs, ops] = await Promise.all([
    db.location.count({ where: { workspaceId: ws.id, warehouseId: id } }),
    db.operationType.count({ where: { workspaceId: ws.id, warehouseId: id } }),
  ]);
  if (locs + ops > 0) {
    return {
      ok: false as const,
      error: "Warehouse has locations or operation types — reassign or delete them first",
    };
  }
  await db.warehouse.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({ action: "DELETE", entityType: "WAREHOUSE", entityId: id, summary: `Deleted warehouse ${id}` });
  revalidatePath("/inventory/warehouses");
  return { ok: true as const };
}
