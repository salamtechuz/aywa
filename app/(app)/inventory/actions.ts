"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

const ProductSchema = z.object({
  sku: z.string().min(1).max(40),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  category: z.string().max(60).optional().or(z.literal("")),
  unit: z.enum(["each", "kg", "hour", "license"]).default("each"),
  price: z.coerce.number().min(0).default(0),
  cost: z.coerce.number().min(0).default(0),
  stockOnHand: z.coerce.number().int().min(0).default(0),
  reorderAt: z.coerce.number().int().min(0).default(0),
});

export async function createProduct(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = ProductSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const existing = await db.product.findFirst({
    where: { workspaceId: ws.id, sku: d.sku },
  });
  if (existing) return { ok: false as const, error: "SKU already exists" };

  await db.product.create({
    data: {
      workspaceId: ws.id,
      sku: d.sku,
      name: d.name,
      description: d.description || null,
      category: d.category || null,
      unit: d.unit,
      price: d.price,
      cost: d.cost,
      stockOnHand: d.stockOnHand,
      reorderAt: d.reorderAt,
    },
  });
  revalidatePath("/inventory");
  return { ok: true as const };
}

const UpdateSchema = ProductSchema.partial().extend({ id: z.string().min(1), active: z.coerce.boolean().optional() });

export async function updateProduct(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...rest } = parsed.data;
  const data: Record<string, unknown> = {};
  if (rest.sku !== undefined) data.sku = rest.sku;
  if (rest.name !== undefined) data.name = rest.name;
  if (rest.description !== undefined) data.description = rest.description || null;
  if (rest.category !== undefined) data.category = rest.category || null;
  if (rest.unit !== undefined) data.unit = rest.unit;
  if (rest.price !== undefined) data.price = rest.price;
  if (rest.cost !== undefined) data.cost = rest.cost;
  if (rest.stockOnHand !== undefined) data.stockOnHand = rest.stockOnHand;
  if (rest.reorderAt !== undefined) data.reorderAt = rest.reorderAt;
  if (rest.active !== undefined) data.active = rest.active;

  await db.product.updateMany({ where: { id, workspaceId: ws.id }, data });
  revalidatePath("/inventory");
  return { ok: true as const };
}

export async function deleteProduct(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();

  // Manufacturing relations are Restrict — deleting a product referenced by a
  // BOM component or a manufacturing order would throw at the DB layer. Check
  // first and return a friendly error instead.
  const [componentUse, orderUse] = await Promise.all([
    db.bomComponent.count({ where: { productId: id, bom: { workspaceId: ws.id } } }),
    db.manufacturingOrder.count({ where: { productId: id, workspaceId: ws.id } }),
  ]);
  if (componentUse > 0) {
    return { ok: false as const, error: "Product is used as a component in a BOM — remove it there first" };
  }
  if (orderUse > 0) {
    return { ok: false as const, error: "Product is used by a manufacturing order — it cannot be deleted" };
  }

  await db.product.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/inventory");
  return { ok: true as const };
}
