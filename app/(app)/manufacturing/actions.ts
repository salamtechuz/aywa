"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";
import { ALL_MO_STATUSES, MO_FLOW } from "@/lib/manufacturing/stages";
import {
  nextBomReference,
  nextManufacturingOrderNumber,
} from "@/lib/manufacturing/queries";
import { syncStockForManufacturingOrder } from "@/lib/manufacturing/sync";
import { syncEntryForManufacturingOrder } from "@/lib/accounting/auto";

const StatusEnum = z.enum(ALL_MO_STATUSES);

function revalidateMo() {
  revalidatePath("/manufacturing");
  revalidatePath("/inventory");
  revalidatePath("/accounting");
  revalidatePath("/dashboard");
}

// ---------- Manufacturing orders ----------

const MoveSchema = z.object({
  orderId: z.string().min(1),
  status: StatusEnum,
  position: z.number().int().min(0),
});

export async function moveManufacturingOrder(input: z.infer<typeof MoveSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const { orderId, status, position } = MoveSchema.parse(input);
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();

  const before = await db.manufacturingOrder.findFirst({
    where: { id: orderId, workspaceId: ws.id },
    select: { status: true },
  });
  if (!before) return { ok: false as const, error: "Order not found" };

  await db.manufacturingOrder.updateMany({
    where: {
      workspaceId: ws.id,
      status,
      position: { gte: position },
      NOT: { id: orderId },
    },
    data: { position: { increment: 1 } },
  });

  await db.manufacturingOrder.updateMany({
    where: { id: orderId, workspaceId: ws.id },
    data: {
      status,
      position,
      ...(status === "DONE" ? { completedDate: new Date() } : {}),
    },
  });

  if (before && before.status !== status) {
    await syncStockForManufacturingOrder(
      ws.id,
      orderId,
      before.status,
      status,
      user?.name ?? user?.email ?? undefined,
    );
    await syncEntryForManufacturingOrder(
      ws.id,
      orderId,
      before.status,
      status,
      user?.name ?? user?.email ?? undefined,
    );
    await logAudit({
      action: "STATUS_CHANGE",
      entityType: "MANUFACTURING_ORDER",
      entityId: orderId,
      summary: `Moved manufacturing order to ${status}`,
      metadata: { from: before.status, to: status },
    });
  }
  revalidateMo();
  return { ok: true as const };
}

const CreateSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  bomId: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(),
  status: StatusEnum.default("DRAFT"),
  scheduledDate: z.string().optional(),
  ownerName: z.string().optional(),
  notes: z.string().optional(),
});

export async function createManufacturingOrder(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const product = await db.product.findFirst({
    where: { id: d.productId, workspaceId: ws.id },
    select: { id: true },
  });
  if (!product) return { ok: false as const, error: "Product not found" };

  // Validate the BOM belongs to this workspace and to this product.
  let bomId: string | null = null;
  if (d.bomId) {
    const bom = await db.bom.findFirst({
      where: { id: d.bomId, workspaceId: ws.id, productId: d.productId },
      select: { id: true },
    });
    bomId = bom?.id ?? null;
  }

  const number = await nextManufacturingOrderNumber(ws.id);
  const maxPos = await db.manufacturingOrder.aggregate({
    where: { workspaceId: ws.id, status: d.status },
    _max: { position: true },
  });

  const created = await db.manufacturingOrder.create({
    data: {
      workspaceId: ws.id,
      number,
      productId: d.productId,
      bomId,
      quantity: d.quantity,
      status: d.status,
      scheduledDate: d.scheduledDate ? new Date(d.scheduledDate) : null,
      ownerName: d.ownerName || null,
      notes: d.notes || null,
      position: (maxPos._max.position ?? -1) + 1,
      ...(d.status === "DONE" ? { completedDate: new Date() } : {}),
    },
  });

  if (d.status === "DONE") {
    await syncStockForManufacturingOrder(
      ws.id,
      created.id,
      null,
      "DONE",
      user?.name ?? user?.email ?? undefined,
    );
    await syncEntryForManufacturingOrder(
      ws.id,
      created.id,
      null,
      "DONE",
      user?.name ?? user?.email ?? undefined,
    );
  }

  await logAudit({
    action: "CREATE",
    entityType: "MANUFACTURING_ORDER",
    entityId: created.id,
    summary: `Created manufacturing order ${number}`,
  });
  revalidateMo();
  return { ok: true as const, number, id: created.id };
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  productId: z.string().optional(),
  bomId: z.string().nullable().optional(),
  quantity: z.coerce.number().positive().optional(),
  status: StatusEnum.optional(),
  scheduledDate: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function updateManufacturingOrder(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, scheduledDate, ...rest } = parsed.data;

  const before = await db.manufacturingOrder.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true, quantity: true },
  });
  if (!before) return { ok: false as const, error: "Order not found" };

  // A completed order's quantity/BOM are baked into committed stock movements;
  // changing them while it stays DONE would desync the ledger. Require reverting
  // it out of DONE first.
  const stayingDone = before.status === "DONE" && (rest.status === undefined || rest.status === "DONE");
  const changesBuild =
    (rest.quantity !== undefined && rest.quantity !== before.quantity) || rest.bomId !== undefined;
  if (stayingDone && changesBuild) {
    return { ok: false as const, error: "Revert this order out of Done before changing quantity or BOM" };
  }

  const data: Record<string, unknown> = { ...rest };
  if (scheduledDate !== undefined) {
    data.scheduledDate =
      scheduledDate === "" || scheduledDate === null ? null : new Date(scheduledDate);
  }
  if (rest.status === "DONE") data.completedDate = new Date();

  await db.manufacturingOrder.updateMany({ where: { id, workspaceId: ws.id }, data });

  if (before && rest.status && before.status !== rest.status) {
    await syncStockForManufacturingOrder(
      ws.id,
      id,
      before.status,
      rest.status,
      user?.name ?? user?.email ?? undefined,
    );
    await syncEntryForManufacturingOrder(
      ws.id,
      id,
      before.status,
      rest.status,
      user?.name ?? user?.email ?? undefined,
    );
  }
  revalidateMo();
  return { ok: true as const };
}

export async function advanceManufacturingOrder(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const order = await db.manufacturingOrder.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true },
  });
  if (!order) return { ok: false as const, error: "Order not found" };
  const idx = MO_FLOW.indexOf(order.status as (typeof MO_FLOW)[number]);
  if (idx < 0 || idx >= MO_FLOW.length - 1) {
    return { ok: false as const, error: "Cannot advance further" };
  }
  const next = MO_FLOW[idx + 1];

  const maxPos = await db.manufacturingOrder.aggregate({
    where: { workspaceId: ws.id, status: next },
    _max: { position: true },
  });

  await db.manufacturingOrder.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      status: next,
      position: (maxPos._max.position ?? -1) + 1,
      ...(next === "DONE" ? { completedDate: new Date() } : {}),
    },
  });

  await syncStockForManufacturingOrder(
    ws.id,
    id,
    order.status,
    next,
    user?.name ?? user?.email ?? undefined,
  );
  await syncEntryForManufacturingOrder(
    ws.id,
    id,
    order.status,
    next,
    user?.name ?? user?.email ?? undefined,
  );
  await logAudit({
    action: "STATUS_CHANGE",
    entityType: "MANUFACTURING_ORDER",
    entityId: id,
    summary: `Advanced manufacturing order to ${next}`,
  });
  revalidateMo();
  return { ok: true as const, next };
}

export async function deleteManufacturingOrder(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const order = await db.manufacturingOrder.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true },
  });
  if (!order) return { ok: false as const, error: "Order not found" };

  // Reverse any committed stock before removing the order so the ledger stays
  // consistent (no-op unless it was DONE).
  await syncStockForManufacturingOrder(
    ws.id,
    id,
    order.status,
    "CANCELLED",
    user?.name ?? user?.email ?? undefined,
  );
  await syncEntryForManufacturingOrder(
    ws.id,
    id,
    order.status,
    "CANCELLED",
    user?.name ?? user?.email ?? undefined,
  );
  await db.manufacturingOrder.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidateMo();
  return { ok: true as const };
}

// ---------- Bills of materials ----------

const ComponentInput = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

const CreateBomSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().positive().default(1),
  notes: z.string().optional().nullable(),
  components: z.array(ComponentInput),
});

function normalizeComponents(components: z.infer<typeof ComponentInput>[]) {
  // Collapse duplicate component products into one line, summing quantities.
  const map = new Map<string, number>();
  for (const c of components) {
    if (!c.productId || c.quantity <= 0) continue;
    map.set(c.productId, (map.get(c.productId) ?? 0) + c.quantity);
  }
  return Array.from(map, ([productId, quantity]) => ({ productId, quantity }));
}

export async function createBom(input: z.infer<typeof CreateBomSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = CreateBomSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const product = await db.product.findFirst({
    where: { id: d.productId, workspaceId: ws.id },
    select: { id: true },
  });
  if (!product) return { ok: false as const, error: "Product not found" };

  const components = normalizeComponents(d.components);
  // Guard against a product consuming itself.
  if (components.some((c) => c.productId === d.productId)) {
    return { ok: false as const, error: "A product cannot be a component of its own BOM" };
  }

  const reference = await nextBomReference(ws.id);
  const created = await db.bom.create({
    data: {
      workspaceId: ws.id,
      productId: d.productId,
      reference,
      quantity: d.quantity,
      notes: d.notes || null,
      components: {
        create: components.map((c, i) => ({
          productId: c.productId,
          quantity: c.quantity,
          position: i,
        })),
      },
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "BOM",
    entityId: created.id,
    summary: `Created BOM ${reference}`,
  });
  revalidatePath("/manufacturing/boms");
  revalidatePath("/manufacturing");
  return { ok: true as const, id: created.id, reference };
}

const UpdateBomSchema = CreateBomSchema.extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateBom(input: z.infer<typeof UpdateBomSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateBomSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const existing = await db.bom.findFirst({
    where: { id: d.id, workspaceId: ws.id },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, error: "BOM not found" };

  const components = normalizeComponents(d.components);
  if (components.some((c) => c.productId === d.productId)) {
    return { ok: false as const, error: "A product cannot be a component of its own BOM" };
  }

  await db.$transaction([
    db.bomComponent.deleteMany({ where: { bomId: d.id, bom: { workspaceId: ws.id } } }),
    db.bom.update({
      where: { id: d.id },
      data: {
        productId: d.productId,
        quantity: d.quantity,
        notes: d.notes || null,
        ...(d.active !== undefined ? { active: d.active } : {}),
        components: {
          create: components.map((c, i) => ({
            productId: c.productId,
            quantity: c.quantity,
            position: i,
          })),
        },
      },
    }),
  ]);
  revalidatePath("/manufacturing/boms");
  revalidatePath("/manufacturing");
  return { ok: true as const };
}

export async function deleteBom(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const inUse = await db.manufacturingOrder.count({ where: { bomId: id, workspaceId: ws.id } });
  if (inUse > 0) {
    return { ok: false as const, error: "BOM is used by manufacturing orders — deactivate it instead" };
  }
  await db.bom.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/manufacturing/boms");
  revalidatePath("/manufacturing");
  return { ok: true as const };
}
