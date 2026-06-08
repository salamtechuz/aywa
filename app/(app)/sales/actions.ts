"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { syncEntryForSalesOrder } from "@/lib/accounting/auto";
import { syncStockForSalesOrder } from "@/lib/inventory/sync";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";
import { deliverWebhook } from "@/lib/webhooks/deliver";
import { ALL_SALES_STATUSES } from "@/lib/sales/stages";
import { nextSalesOrderNumber } from "@/lib/sales/queries";

const StatusEnum = z.enum(ALL_SALES_STATUSES);

const MoveSchema = z.object({
  orderId: z.string().min(1),
  status: StatusEnum,
  position: z.number().int().min(0),
});

export async function moveOrder(input: z.infer<typeof MoveSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const { orderId, status, position } = MoveSchema.parse(input);
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();

  const before = await db.salesOrder.findFirst({
    where: { id: orderId, workspaceId: ws.id },
    select: { status: true },
  });

  await db.salesOrder.updateMany({
    where: {
      workspaceId: ws.id,
      status,
      position: { gte: position },
      NOT: { id: orderId },
    },
    data: { position: { increment: 1 } },
  });

  await db.salesOrder.updateMany({
    where: { id: orderId, workspaceId: ws.id },
    data: { status, position },
  });

  if (before && before.status !== status) {
    await syncStockForSalesOrder(
      ws.id,
      orderId,
      before.status,
      status,
      user?.name ?? user?.email ?? undefined,
    );
    await syncEntryForSalesOrder(
      ws.id,
      orderId,
      before.status,
      status,
      user?.name ?? user?.email ?? undefined,
    );
    await logAudit({
      action: "STATUS_CHANGE",
      entityType: "ORDER",
      entityId: orderId,
      summary: `Moved sales order to ${status}`,
      metadata: { from: before.status, to: status },
    });
    if (status === "DELIVERED") {
      void deliverWebhook(ws.id, "order.delivered", { id: orderId, status });
    }
    if (status === "INVOICED") {
      void deliverWebhook(ws.id, "order.invoiced", { id: orderId, status });
    }
    revalidatePath("/inventory");
    revalidatePath("/accounting");
    revalidatePath("/dashboard");
  }
  revalidatePath("/sales");
  return { ok: true as const };
}

const CreateSchema = z.object({
  customerId: z.string().optional().nullable(),
  amount: z.coerce.number().min(0).default(0),
  status: StatusEnum.default("DRAFT"),
  ownerName: z.string().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createQuote(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const number = await nextSalesOrderNumber(ws.id);

  const maxPos = await db.salesOrder.aggregate({
    where: { workspaceId: ws.id, status: d.status },
    _max: { position: true },
  });

  const created = await db.salesOrder.create({
    data: {
      workspaceId: ws.id,
      number,
      customerId: d.customerId || null,
      amount: d.amount,
      status: d.status,
      ownerName: d.ownerName || null,
      notes: d.notes || null,
      expectedDate: d.expectedDate ? new Date(d.expectedDate) : null,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  await logAudit({
    action: "CREATE",
    entityType: "ORDER",
    entityId: created.id,
    summary: `Created sales order ${number}`,
  });
  void deliverWebhook(ws.id, "order.created", {
    id: created.id,
    number,
    amount: created.amount,
    status: created.status,
  });

  revalidatePath("/sales");
  return { ok: true as const, number };
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().nullable().optional(),
  amount: z.coerce.number().min(0).optional(),
  status: StatusEnum.optional(),
  ownerName: z.string().nullable().optional(),
  expectedDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function updateOrder(formData: FormData) {
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

  const before = await db.salesOrder.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true },
  });
  await db.salesOrder.updateMany({
    where: { id, workspaceId: ws.id },
    data,
  });

  if (before && rest.status && before.status !== rest.status) {
    await syncStockForSalesOrder(
      ws.id,
      id,
      before.status,
      rest.status,
      user?.name ?? user?.email ?? undefined,
    );
    await syncEntryForSalesOrder(
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
  revalidatePath("/sales");
  return { ok: true as const };
}

export async function deleteOrder(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.salesOrder.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/sales");
  return { ok: true as const };
}

export async function advanceOrder(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const order = await db.salesOrder.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true },
  });
  if (!order) return { ok: false as const, error: "Order not found" };
  const flow = ["DRAFT", "SENT", "CONFIRMED", "DELIVERED", "INVOICED"];
  const idx = flow.indexOf(order.status);
  if (idx < 0 || idx >= flow.length - 1) return { ok: false as const, error: "Cannot advance further" };
  const next = flow[idx + 1];

  const maxPos = await db.salesOrder.aggregate({
    where: { workspaceId: ws.id, status: next },
    _max: { position: true },
  });

  await db.salesOrder.updateMany({
    where: { id, workspaceId: ws.id },
    data: { status: next, position: (maxPos._max.position ?? -1) + 1 },
  });

  await syncStockForSalesOrder(
    ws.id,
    id,
    order.status,
    next,
    user?.name ?? user?.email ?? undefined,
  );
  await syncEntryForSalesOrder(
    ws.id,
    id,
    order.status,
    next,
    user?.name ?? user?.email ?? undefined,
  );

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/accounting");
  revalidatePath("/dashboard");
  return { ok: true as const, next };
}
