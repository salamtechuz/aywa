"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

// Empty form fields → undefined → stored as null ("unlimited"). A checkbox that
// is off is absent from FormData, so `allowNew` preprocesses undefined → false.
const StorageCategorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  capacity: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).optional(),
  ),
  maxWeight: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
  allowNew: z.preprocess((v) => v === "true", z.boolean()),
});

export async function createStorageCategory(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = StorageCategorySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const created = await db.storageCategory.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      capacity: d.capacity ?? null,
      maxWeight: d.maxWeight ?? null,
      allowNew: d.allowNew,
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "STORAGE_CATEGORY",
    entityId: created.id,
    summary: `Created storage category ${d.name}`,
  });
  revalidatePath("/inventory/storage-categories");
  return { ok: true as const, id: created.id };
}

const UpdateStorageCategorySchema = StorageCategorySchema.extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateStorageCategory(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateStorageCategorySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...d } = parsed.data;
  await db.storageCategory.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      name: d.name,
      capacity: d.capacity ?? null,
      maxWeight: d.maxWeight ?? null,
      allowNew: d.allowNew,
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "STORAGE_CATEGORY",
    entityId: id,
    summary: `Updated storage category ${d.name}`,
  });
  revalidatePath("/inventory/storage-categories");
  return { ok: true as const };
}

export async function deleteStorageCategory(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const inUse = await db.location.count({ where: { workspaceId: ws.id, storageCategoryId: id } });
  if (inUse > 0) {
    return { ok: false as const, error: "Storage category is used by locations — reassign them first" };
  }
  await db.storageCategory.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({
    action: "DELETE",
    entityType: "STORAGE_CATEGORY",
    entityId: id,
    summary: `Deleted storage category ${id}`,
  });
  revalidatePath("/inventory/storage-categories");
  return { ok: true as const };
}
