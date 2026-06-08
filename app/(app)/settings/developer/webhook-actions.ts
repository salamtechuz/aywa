"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanAdmin } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { generateWebhookSecret } from "@/lib/webhooks/deliver";

const CreateSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(ALL_WEBHOOK_EVENTS as [string, ...string[]])).min(1),
});

export async function createWebhook(input: {
  url: string;
  events: string[];
}) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ws = await getActiveWorkspace();
  const secret = generateWebhookSecret();
  const created = await db.webhookEndpoint.create({
    data: {
      workspaceId: ws.id,
      url: parsed.data.url,
      events: parsed.data.events.join(","),
      secret,
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "OTHER",
    entityId: created.id,
    summary: `Added webhook endpoint ${parsed.data.url}`,
  });
  revalidatePath("/settings/developer");
  return { ok: true as const, id: created.id, secret };
}

export async function updateWebhook(input: {
  id: string;
  url?: string;
  events?: string[];
  active?: boolean;
}) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.webhookEndpoint.updateMany({
    where: { id: input.id, workspaceId: ws.id },
    data: {
      ...(input.url ? { url: input.url } : {}),
      ...(input.events ? { events: input.events.join(",") } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "OTHER",
    entityId: input.id,
    summary: "Updated webhook endpoint",
  });
  revalidatePath("/settings/developer");
  return { ok: true as const };
}

export async function deleteWebhook(id: string) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.webhookEndpoint.deleteMany({
    where: { id, workspaceId: ws.id },
  });
  await logAudit({
    action: "DELETE",
    entityType: "OTHER",
    entityId: id,
    summary: "Deleted webhook endpoint",
  });
  revalidatePath("/settings/developer");
  return { ok: true as const };
}
