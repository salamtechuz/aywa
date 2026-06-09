"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { pushEntity } from "@/lib/odoo/sync";
import { syncEntryForPurchaseOrder } from "@/lib/accounting/auto";
import { syncStockForPurchaseOrder } from "@/lib/inventory/sync";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";
import { ALL_PURCHASE_STATUSES } from "@/lib/purchase/stages";
import { nextPurchaseOrderNumber } from "@/lib/purchase/queries";

const StatusEnum = z.enum(ALL_PURCHASE_STATUSES);

const MoveSchema = z.object({
  orderId: z.string().min(1),
  status: StatusEnum,
  position: z.number().int().min(0),
});

export async function movePurchaseOrder(input: z.infer<typeof MoveSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const { orderId, status, position } = MoveSchema.parse(input);
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();

  const before = await db.purchaseOrder.findFirst({
    where: { id: orderId, workspaceId: ws.id },
    select: { status: true },
  });

  await db.purchaseOrder.updateMany({
    where: {
      workspaceId: ws.id,
      status,
      position: { gte: position },
      NOT: { id: orderId },
    },
    data: { position: { increment: 1 } },
  });

  await db.purchaseOrder.updateMany({
    where: { id: orderId, workspaceId: ws.id },
    data: { status, position },
  });

  if (before && before.status !== status) {
    await syncStockForPurchaseOrder(
      ws.id,
      orderId,
      before.status,
      status,
      user?.name ?? user?.email ?? undefined,
    );
    await syncEntryForPurchaseOrder(
      ws.id,
      orderId,
      before.status,
      status,
      user?.name ?? user?.email ?? undefined,
    );
    revalidatePath("/inventory");
    revalidatePath("/accounting");
    revalidatePath("/dashboard");
  }
  void pushEntity(ws.id, "purchase_order", orderId);
  revalidatePath("/purchase");
  return { ok: true as const };
}

const CreateSchema = z.object({
  vendorId: z.string().optional().nullable(),
  status: StatusEnum.default("DRAFT"),
  ownerName: z.string().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createPurchaseOrder(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const number = await nextPurchaseOrderNumber(ws.id);

  const maxPos = await db.purchaseOrder.aggregate({
    where: { workspaceId: ws.id, status: d.status },
    _max: { position: true },
  });

  const created = await db.purchaseOrder.create({
    data: {
      workspaceId: ws.id,
      number,
      vendorId: d.vendorId || null,
      status: d.status,
      ownerName: d.ownerName || null,
      notes: d.notes || null,
      expectedDate: d.expectedDate ? new Date(d.expectedDate) : null,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  void pushEntity(ws.id, "purchase_order", created.id);
  revalidatePath("/purchase");
  return { ok: true as const, number, id: created.id };
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  vendorId: z.string().nullable().optional(),
  status: StatusEnum.optional(),
  ownerName: z.string().nullable().optional(),
  expectedDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function updatePurchaseOrder(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, expectedDate, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (expectedDate !== undefined) {
    data.expectedDate =
      expectedDate === "" || expectedDate === null ? null : new Date(expectedDate);
  }

  const before = await db.purchaseOrder.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true },
  });
  await db.purchaseOrder.updateMany({
    where: { id, workspaceId: ws.id },
    data,
  });

  if (before && rest.status && before.status !== rest.status) {
    await syncStockForPurchaseOrder(
      ws.id,
      id,
      before.status,
      rest.status,
      user?.name ?? user?.email ?? undefined,
    );
    await syncEntryForPurchaseOrder(
      ws.id,
      id,
      before.status,
      rest.status,
      user?.name ?? user?.email ?? undefined,
    );
    revalidatePath("/inventory");
    revalidatePath("/accounting");
    revalidatePath("/dashboard");
  }
  void pushEntity(ws.id, "purchase_order", id);
  revalidatePath("/purchase");
  return { ok: true as const };
}

export async function deletePurchaseOrder(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.purchaseOrder.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/purchase");
  return { ok: true as const };
}

export async function advancePurchaseOrder(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const order = await db.purchaseOrder.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true },
  });
  if (!order) return { ok: false as const, error: "Order not found" };
  const flow = ["DRAFT", "RFQ_SENT", "APPROVED", "RECEIVED", "BILLED"];
  const idx = flow.indexOf(order.status);
  if (idx < 0 || idx >= flow.length - 1) return { ok: false as const, error: "Cannot advance further" };
  const next = flow[idx + 1];

  const maxPos = await db.purchaseOrder.aggregate({
    where: { workspaceId: ws.id, status: next },
    _max: { position: true },
  });

  await db.purchaseOrder.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      status: next,
      position: (maxPos._max.position ?? -1) + 1,
      ...(next === "RECEIVED" ? { receivedDate: new Date() } : {}),
    },
  });

  await syncStockForPurchaseOrder(
    ws.id,
    id,
    order.status,
    next,
    user?.name ?? user?.email ?? undefined,
  );
  await syncEntryForPurchaseOrder(
    ws.id,
    id,
    order.status,
    next,
    user?.name ?? user?.email ?? undefined,
  );

  void pushEntity(ws.id, "purchase_order", id);
  revalidatePath("/purchase");
  revalidatePath("/inventory");
  revalidatePath("/accounting");
  revalidatePath("/dashboard");
  return { ok: true as const, next };
}

// ---------- Line items ----------

const AddLineSchema = z.object({
  orderId: z.string().min(1),
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
});

export async function addPurchaseLine(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = AddLineSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const order = await db.purchaseOrder.findFirst({
    where: { id: d.orderId, workspaceId: ws.id },
  });
  if (!order) return { ok: false as const, error: "Order not found" };

  const maxPos = await db.purchaseOrderLine.aggregate({
    where: { orderId: d.orderId },
    _max: { position: true },
  });

  await db.purchaseOrderLine.create({
    data: {
      orderId: d.orderId,
      productId: d.productId || null,
      description: d.description,
      quantity: d.quantity,
      unitCost: d.unitCost,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  await recomputePurchaseAmount(d.orderId);
  void pushEntity(ws.id, "purchase_order", d.orderId);
  revalidatePath("/purchase");
  return { ok: true as const };
}

export async function deletePurchaseLine(lineId: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const line = await db.purchaseOrderLine.findFirst({
    where: { id: lineId, order: { workspaceId: ws.id } },
    select: { orderId: true },
  });
  if (!line) return { ok: false as const, error: "Line not found" };
  await db.purchaseOrderLine.delete({ where: { id: lineId } });
  await recomputePurchaseAmount(line.orderId);
  void pushEntity(ws.id, "purchase_order", line.orderId);
  revalidatePath("/purchase");
  return { ok: true as const };
}

async function recomputePurchaseAmount(orderId: string) {
  const lines = await db.purchaseOrderLine.findMany({ where: { orderId } });
  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  await db.purchaseOrder.update({
    where: { id: orderId },
    data: { amount: total },
  });
}

// ---------- Vendors ----------

const CreateVendorSchema = z.object({
  name: z.string().min(1),
  vendorCode: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
  paymentTerms: z.string().optional(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
});

export async function createVendor(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateVendorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const created = await db.vendor.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      vendorCode: d.vendorCode || null,
      email: d.email || null,
      phone: d.phone || null,
      contactPerson: d.contactPerson || null,
      paymentTerms: d.paymentTerms || null,
      currency: d.currency || "USD",
      notes: d.notes || null,
    },
  });
  void pushEntity(ws.id, "vendor", created.id);
  revalidatePath("/purchase/vendors");
  revalidatePath("/purchase");
  return { ok: true as const, id: created.id };
}

const UpdateVendorSchema = CreateVendorSchema.extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateVendor(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateVendorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...d } = parsed.data;
  await db.vendor.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      name: d.name,
      vendorCode: d.vendorCode || null,
      email: d.email || null,
      phone: d.phone || null,
      contactPerson: d.contactPerson || null,
      paymentTerms: d.paymentTerms || null,
      currency: d.currency,
      notes: d.notes || null,
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  void pushEntity(ws.id, "vendor", id);
  revalidatePath("/purchase/vendors");
  revalidatePath("/purchase");
  return { ok: true as const };
}

export async function deleteVendor(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.vendor.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/purchase/vendors");
  revalidatePath("/purchase");
  return { ok: true as const };
}
