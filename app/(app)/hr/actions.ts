"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

const EmployeeSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
});

export async function createEmployee(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const raw = Object.fromEntries(formData.entries());
  const parsed = EmployeeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const ws = await getActiveWorkspace();
  const created = await db.employee.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      title: d.title || null,
      department: d.department || null,
      hireDate: d.hireDate ? new Date(d.hireDate) : null,
      status: d.status,
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "OTHER",
    entityId: created.id,
    summary: `Hired ${d.name}`,
  });
  revalidatePath("/hr");
  return { ok: true as const, id: created.id };
}

export async function deleteEmployee(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.employee.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({
    action: "DELETE",
    entityType: "OTHER",
    entityId: id,
    summary: "Removed employee",
  });
  revalidatePath("/hr");
  return { ok: true as const };
}

const TimeOffSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["VACATION", "SICK", "PERSONAL", "OTHER"]).default("VACATION"),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
});

export async function createTimeOff(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const raw = Object.fromEntries(formData.entries());
  const parsed = TimeOffSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const ws = await getActiveWorkspace();
  const created = await db.timeOffRequest.create({
    data: {
      workspaceId: ws.id,
      employeeId: d.employeeId,
      type: d.type,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      reason: d.reason || null,
      status: "PENDING",
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "OTHER",
    entityId: created.id,
    summary: `Filed ${d.type.toLowerCase()} request`,
  });
  revalidatePath("/hr");
  revalidatePath("/calendar");
  return { ok: true as const };
}

export async function approveTimeOff(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.timeOffRequest.updateMany({
    where: { id, workspaceId: ws.id },
    data: { status: "APPROVED", reviewedAt: new Date() },
  });
  await logAudit({
    action: "STATUS_CHANGE",
    entityType: "OTHER",
    entityId: id,
    summary: "Approved time-off request",
  });
  revalidatePath("/hr");
  revalidatePath("/calendar");
  return { ok: true as const };
}

export async function denyTimeOff(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.timeOffRequest.updateMany({
    where: { id, workspaceId: ws.id },
    data: { status: "DENIED", reviewedAt: new Date() },
  });
  revalidatePath("/hr");
  revalidatePath("/calendar");
  return { ok: true as const };
}
