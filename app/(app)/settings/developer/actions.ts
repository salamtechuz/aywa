"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { generateToken, hashToken } from "@/lib/api/tokens";
import { db } from "@/lib/db";
import { assertCanAdmin } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  scope: z.enum(["READ", "WRITE"]).default("READ"),
});

export async function createApiToken(formData: FormData) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const { token, prefix } = generateToken(parsed.data.scope);
  const tokenHash = await hashToken(token);

  const created = await db.apiToken.create({
    data: {
      workspaceId: ws.id,
      name: parsed.data.name,
      prefix,
      tokenHash,
      scope: parsed.data.scope,
      createdBy: user?.name ?? user?.email ?? null,
    },
  });

  await logAudit({
    action: "CREATE",
    entityType: "OTHER",
    entityId: created.id,
    summary: `Created ${parsed.data.scope.toLowerCase()} API token "${parsed.data.name}"`,
  });

  revalidatePath("/settings/developer");

  // The plaintext token is returned exactly once. Caller is responsible
  // for displaying it and prompting the user to copy.
  return { ok: true as const, token, prefix };
}

export async function revokeApiToken(id: string) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.apiToken.updateMany({
    where: { id, workspaceId: ws.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await logAudit({
    action: "DELETE",
    entityType: "OTHER",
    entityId: id,
    summary: "Revoked API token",
  });
  revalidatePath("/settings/developer");
  return { ok: true as const };
}
