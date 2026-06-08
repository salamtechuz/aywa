"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";

const ActivityTypeEnum = z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "TASK"]);

const CreateSchema = z.object({
  dealId: z.string().min(1),
  type: ActivityTypeEnum,
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  dueAt: z.string().optional(),
});

export async function createActivity(input: z.infer<typeof CreateSchema>) {
  const ws = await getActiveWorkspace();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const deal = await db.deal.findFirst({
    where: { id: d.dealId, workspaceId: ws.id },
  });
  if (!deal) return { ok: false as const, error: "Deal not found" };

  // Notes/Calls/Emails are logged-as-done. Tasks/Meetings are upcoming.
  const isLog = d.type === "NOTE" || d.type === "CALL" || d.type === "EMAIL";
  await db.activity.create({
    data: {
      workspaceId: ws.id,
      dealId: d.dealId,
      type: d.type,
      title: d.title,
      body: d.body || null,
      dueAt: !isLog && d.dueAt ? new Date(d.dueAt) : null,
      doneAt: isLog ? new Date() : null,
    },
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function toggleActivityDone(id: string) {
  const ws = await getActiveWorkspace();
  const a = await db.activity.findFirst({ where: { id, workspaceId: ws.id } });
  if (!a) return { ok: false as const, error: "Not found" };
  await db.activity.update({
    where: { id },
    data: { doneAt: a.doneAt ? null : new Date() },
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function deleteActivity(id: string) {
  const ws = await getActiveWorkspace();
  await db.activity.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/crm");
  return { ok: true as const };
}
