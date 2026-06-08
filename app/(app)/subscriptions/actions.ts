"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

const BILLING_PERIODS = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;
const STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"] as const;

function monthsFor(period: (typeof BILLING_PERIODS)[number]): number {
  return period === "MONTHLY" ? 1 : period === "QUARTERLY" ? 3 : 12;
}

function nextRenewalFrom(start: Date, months: number): Date {
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d;
}

const CreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customerId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  billingPeriod: z.enum(BILLING_PERIODS).default("MONTHLY"),
  quantity: z.coerce.number().int().positive().default(1),
  unitPrice: z.coerce.number().min(0),
  currency: z.string().default("USD"),
  startDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createSubscription(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const months = monthsFor(d.billingPeriod);
  const start = d.startDate ? new Date(d.startDate) : new Date();
  const renewal = nextRenewalFrom(start, months);

  const created = await db.subscription.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      customerId: d.customerId || null,
      productId: d.productId || null,
      billingPeriod: d.billingPeriod,
      billingPeriodMonths: months,
      quantity: d.quantity,
      unitPrice: d.unitPrice,
      currency: d.currency || "USD",
      status: "ACTIVE",
      startDate: start,
      nextRenewalDate: renewal,
      notes: d.notes || null,
    },
  });

  await logAudit({
    action: "CREATE",
    entityType: "OTHER",
    entityId: created.id,
    summary: `Created subscription "${d.name}" — ${d.unitPrice} ${d.currency} / ${d.billingPeriod.toLowerCase()}`,
  });

  revalidatePath("/subscriptions");
  revalidatePath("/reports");
  return { ok: true as const, id: created.id };
}

const UpdateSchema = CreateSchema.extend({
  id: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  endDate: z.string().nullable().optional(),
});

export async function updateSubscription(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, billingPeriod, startDate, endDate, ...rest } = parsed.data;

  const data: Record<string, unknown> = {
    name: rest.name,
    customerId: rest.customerId || null,
    productId: rest.productId || null,
    quantity: rest.quantity,
    unitPrice: rest.unitPrice,
    currency: rest.currency,
    notes: rest.notes || null,
    billingPeriod,
    billingPeriodMonths: monthsFor(billingPeriod),
  };
  if (rest.status) data.status = rest.status;
  if (startDate) data.startDate = new Date(startDate);
  if (endDate !== undefined) {
    data.endDate = endDate === "" || endDate === null ? null : new Date(endDate);
  }

  await db.subscription.updateMany({
    where: { id, workspaceId: ws.id },
    data,
  });
  await logAudit({
    action: "UPDATE",
    entityType: "OTHER",
    entityId: id,
    summary: `Updated subscription "${rest.name}"`,
  });
  revalidatePath("/subscriptions");
  revalidatePath("/reports");
  return { ok: true as const };
}

export async function cancelSubscription(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.subscription.updateMany({
    where: { id, workspaceId: ws.id },
    data: { status: "CANCELLED", endDate: new Date() },
  });
  await logAudit({
    action: "STATUS_CHANGE",
    entityType: "OTHER",
    entityId: id,
    summary: "Cancelled subscription",
  });
  revalidatePath("/subscriptions");
  revalidatePath("/reports");
  return { ok: true as const };
}

export async function pauseSubscription(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.subscription.updateMany({
    where: { id, workspaceId: ws.id },
    data: { status: "PAUSED" },
  });
  await logAudit({
    action: "STATUS_CHANGE",
    entityType: "OTHER",
    entityId: id,
    summary: "Paused subscription",
  });
  revalidatePath("/subscriptions");
  revalidatePath("/reports");
  return { ok: true as const };
}

export async function resumeSubscription(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.subscription.updateMany({
    where: { id, workspaceId: ws.id },
    data: { status: "ACTIVE", endDate: null },
  });
  await logAudit({
    action: "STATUS_CHANGE",
    entityType: "OTHER",
    entityId: id,
    summary: "Resumed subscription",
  });
  revalidatePath("/subscriptions");
  revalidatePath("/reports");
  return { ok: true as const };
}

export async function deleteSubscription(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.subscription.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({
    action: "DELETE",
    entityType: "OTHER",
    entityId: id,
    summary: "Deleted subscription",
  });
  revalidatePath("/subscriptions");
  revalidatePath("/reports");
  return { ok: true as const };
}
