"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

const ProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  customerId: z.string().optional().nullable(),
  ownerName: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
});

export async function createProject(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const parsed = ProjectSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const ws = await getActiveWorkspace();
  const created = await db.project.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      description: d.description || null,
      customerId: d.customerId || null,
      ownerName: d.ownerName || null,
      startDate: d.startDate ? new Date(d.startDate) : null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      budget: d.budget ?? null,
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "OTHER",
    entityId: created.id,
    summary: `Created project "${d.name}"`,
  });
  revalidatePath("/projects");
  return { ok: true as const, id: created.id };
}

export async function deleteProject(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.project.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({
    action: "DELETE",
    entityType: "OTHER",
    entityId: id,
    summary: "Deleted project",
  });
  revalidatePath("/projects");
  return { ok: true as const };
}

// ---------- Tasks ----------

const TaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200),
  assigneeName: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]).default("BACKLOG"),
});

export async function createTask(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const parsed = TaskSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const ws = await getActiveWorkspace();
  const maxPos = await db.task.aggregate({
    where: { projectId: d.projectId, status: d.status },
    _max: { position: true },
  });
  await db.task.create({
    data: {
      workspaceId: ws.id,
      projectId: d.projectId,
      title: d.title,
      assigneeName: d.assigneeName || null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      status: d.status,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });
  revalidatePath(`/projects/${d.projectId}`);
  revalidatePath("/projects");
  return { ok: true as const };
}

const MoveTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]),
  position: z.number().int().min(0),
});

export async function moveTask(input: z.infer<typeof MoveTaskSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const parsed = MoveTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { taskId, status, position } = parsed.data;
  const ws = await getActiveWorkspace();

  const task = await db.task.findFirst({ where: { id: taskId, workspaceId: ws.id } });
  if (!task) return { ok: false as const, error: "Task not found" };

  await db.task.updateMany({
    where: {
      workspaceId: ws.id,
      projectId: task.projectId,
      status,
      position: { gte: position },
      NOT: { id: taskId },
    },
    data: { position: { increment: 1 } },
  });

  await db.task.updateMany({
    where: { id: taskId, workspaceId: ws.id },
    data: { status, position },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/projects");
  return { ok: true as const };
}

export async function deleteTask(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const task = await db.task.findFirst({ where: { id, workspaceId: ws.id }, select: { projectId: true } });
  await db.task.deleteMany({ where: { id, workspaceId: ws.id } });
  if (task) revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/projects");
  return { ok: true as const };
}
