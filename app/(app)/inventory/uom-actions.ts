"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";
import { UOM_CATEGORY_IDS } from "@/lib/inventory/config";

const UomSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  category: z.enum(UOM_CATEGORY_IDS),
  // Empty factor field defaults to 1 (a reference unit); must be > 0.
  factor: z.preprocess(
    (v) => (v === "" || v == null ? 1 : v),
    z.coerce.number().positive("Contains must be greater than zero"),
  ),
  referenceUnit: z.string().trim().max(40).optional().or(z.literal("")),
});

export async function createUnitOfMeasure(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UomSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const dupe = await db.unitOfMeasure.findFirst({
    where: { workspaceId: ws.id, name: d.name },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Unit ${d.name} already exists` };

  const created = await db.unitOfMeasure.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      category: d.category,
      factor: d.factor,
      referenceUnit: d.referenceUnit || null,
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "UNIT_OF_MEASURE",
    entityId: created.id,
    summary: `Created unit of measure ${d.name}`,
  });
  revalidatePath("/inventory/units");
  return { ok: true as const, id: created.id };
}

const UpdateUomSchema = UomSchema.extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateUnitOfMeasure(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateUomSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...d } = parsed.data;
  const dupe = await db.unitOfMeasure.findFirst({
    where: { workspaceId: ws.id, name: d.name, NOT: { id } },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Unit ${d.name} already exists` };

  await db.unitOfMeasure.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      name: d.name,
      category: d.category,
      factor: d.factor,
      referenceUnit: d.referenceUnit || null,
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "UNIT_OF_MEASURE",
    entityId: id,
    summary: `Updated unit of measure ${d.name}`,
  });
  revalidatePath("/inventory/units");
  return { ok: true as const };
}

export async function deleteUnitOfMeasure(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.unitOfMeasure.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({
    action: "DELETE",
    entityType: "UNIT_OF_MEASURE",
    entityId: id,
    summary: `Deleted unit of measure ${id}`,
  });
  revalidatePath("/inventory/units");
  return { ok: true as const };
}
