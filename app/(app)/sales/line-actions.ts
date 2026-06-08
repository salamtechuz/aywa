"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";

// Recompute the order's total amount from its line items.
async function recomputeAmount(orderId: string) {
  const lines = await db.salesOrderLine.findMany({ where: { orderId } });
  const total = lines.reduce(
    (s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100),
    0,
  );
  await db.salesOrder.update({ where: { id: orderId }, data: { amount: total } });
}

async function assertOrderOwned(orderId: string, workspaceId: string) {
  const o = await db.salesOrder.findFirst({ where: { id: orderId, workspaceId } });
  return o;
}

const AddLineSchema = z.object({
  orderId: z.string().min(1),
  productId: z.string().optional().nullable(),
  description: z.string().min(1).max(200),
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).max(100).default(0),
});

export async function addLine(input: z.infer<typeof AddLineSchema>) {
  const ws = await getActiveWorkspace();
  const parsed = AddLineSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const order = await assertOrderOwned(d.orderId, ws.id);
  if (!order) return { ok: false as const, error: "Order not found" };

  // If productId is provided, prefer product's price/name when fields are unset.
  let description = d.description;
  let unitPrice = d.unitPrice;
  if (d.productId) {
    const product = await db.product.findFirst({
      where: { id: d.productId, workspaceId: ws.id },
    });
    if (product) {
      if (!description) description = product.name;
      if (unitPrice === 0) unitPrice = product.price;
    }
  }

  const maxPos = await db.salesOrderLine.aggregate({
    where: { orderId: d.orderId },
    _max: { position: true },
  });

  await db.salesOrderLine.create({
    data: {
      orderId: d.orderId,
      productId: d.productId || null,
      description,
      quantity: d.quantity,
      unitPrice,
      discount: d.discount,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  await recomputeAmount(d.orderId);
  revalidatePath("/sales");
  return { ok: true as const };
}

const UpdateLineSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(200).optional(),
  quantity: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).max(100).optional(),
});

export async function updateLine(input: z.infer<typeof UpdateLineSchema>) {
  const ws = await getActiveWorkspace();
  const parsed = UpdateLineSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...rest } = parsed.data;
  const line = await db.salesOrderLine.findFirst({
    where: { id, order: { workspaceId: ws.id } },
  });
  if (!line) return { ok: false as const, error: "Line not found" };

  await db.salesOrderLine.update({ where: { id }, data: rest });
  await recomputeAmount(line.orderId);
  revalidatePath("/sales");
  return { ok: true as const };
}

export async function deleteLine(id: string) {
  const ws = await getActiveWorkspace();
  const line = await db.salesOrderLine.findFirst({
    where: { id, order: { workspaceId: ws.id } },
  });
  if (!line) return { ok: false as const, error: "Line not found" };
  await db.salesOrderLine.delete({ where: { id } });
  await recomputeAmount(line.orderId);
  revalidatePath("/sales");
  return { ok: true as const };
}
