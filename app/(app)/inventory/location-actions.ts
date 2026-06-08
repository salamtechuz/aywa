"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";
import { LOCATION_TYPE_IDS } from "@/lib/inventory/config";

const LocationSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(160),
  code: z.string().trim().min(1, "Code is required").max(24),
  type: z.enum(LOCATION_TYPE_IDS),
  warehouseId: z.string().optional().or(z.literal("")),
  storageCategoryId: z.string().optional().or(z.literal("")),
});

async function resolveWarehouseId(workspaceId: string, id?: string) {
  if (!id) return null;
  const wh = await db.warehouse.findFirst({ where: { id, workspaceId }, select: { id: true } });
  return wh ? id : ("INVALID" as const);
}
async function resolveCategoryId(workspaceId: string, id?: string) {
  if (!id) return null;
  const sc = await db.storageCategory.findFirst({ where: { id, workspaceId }, select: { id: true } });
  return sc ? id : ("INVALID" as const);
}

export async function createLocation(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = LocationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const dupe = await db.location.findFirst({
    where: { workspaceId: ws.id, code: d.code },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Location code ${d.code} already exists` };

  const warehouseId = await resolveWarehouseId(ws.id, d.warehouseId || undefined);
  if (warehouseId === "INVALID") return { ok: false as const, error: "Warehouse not found" };
  const storageCategoryId = await resolveCategoryId(ws.id, d.storageCategoryId || undefined);
  if (storageCategoryId === "INVALID") return { ok: false as const, error: "Storage category not found" };

  const created = await db.location.create({
    data: { workspaceId: ws.id, name: d.name, code: d.code, type: d.type, warehouseId, storageCategoryId },
  });
  await logAudit({
    action: "CREATE",
    entityType: "LOCATION",
    entityId: created.id,
    summary: `Created location ${d.code} ${d.name}`,
  });
  revalidatePath("/inventory/locations");
  return { ok: true as const, id: created.id };
}

const UpdateLocationSchema = LocationSchema.extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateLocation(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateLocationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...d } = parsed.data;
  const dupe = await db.location.findFirst({
    where: { workspaceId: ws.id, code: d.code, NOT: { id } },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Location code ${d.code} already exists` };

  const warehouseId = await resolveWarehouseId(ws.id, d.warehouseId || undefined);
  if (warehouseId === "INVALID") return { ok: false as const, error: "Warehouse not found" };
  const storageCategoryId = await resolveCategoryId(ws.id, d.storageCategoryId || undefined);
  if (storageCategoryId === "INVALID") return { ok: false as const, error: "Storage category not found" };

  await db.location.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      name: d.name,
      code: d.code,
      type: d.type,
      warehouseId,
      storageCategoryId,
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "LOCATION",
    entityId: id,
    summary: `Updated location ${d.code}`,
  });
  revalidatePath("/inventory/locations");
  return { ok: true as const };
}

export async function deleteLocation(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.location.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({ action: "DELETE", entityType: "LOCATION", entityId: id, summary: `Deleted location ${id}` });
  revalidatePath("/inventory/locations");
  return { ok: true as const };
}
