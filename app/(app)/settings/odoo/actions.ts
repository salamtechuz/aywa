"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { testOdooConnection as runTest } from "@/lib/odoo/client";
import { connToConfig } from "@/lib/odoo/config";
import { encryptSecret } from "@/lib/odoo/crypto";
import { registry } from "@/lib/odoo/registry";
import { pushEntity, runOdooPull } from "@/lib/odoo/sync";
import { assertCanAdmin } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";

const SaveSchema = z.object({
  baseUrl: z.string().url().max(200),
  db: z.string().min(1).max(120),
  username: z.string().min(1).max(160),
  apiKey: z.string().max(200).optional(),
  enabledEntities: z.array(z.string()).default([]),
  active: z.boolean().default(false),
});

function newSecret(): string {
  return `odsec_${randomBytes(24).toString("hex")}`;
}

export async function saveOdooConnection(input: unknown) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const d = parsed.data;

  const existing = await db.odooConnection.findFirst({ where: { workspaceId: ws.id } });
  if (!existing && !d.apiKey) {
    return { ok: false as const, error: "API key is required" };
  }
  const enabledEntities = d.enabledEntities.join(",");

  if (existing) {
    await db.odooConnection.update({
      where: { id: existing.id },
      data: {
        baseUrl: d.baseUrl,
        db: d.db,
        username: d.username,
        ...(d.apiKey ? { apiKey: encryptSecret(d.apiKey) } : {}),
        enabledEntities,
        active: d.active,
        webhookSecret: existing.webhookSecret ?? newSecret(),
      },
    });
  } else {
    await db.odooConnection.create({
      data: {
        workspaceId: ws.id,
        baseUrl: d.baseUrl,
        db: d.db,
        username: d.username,
        apiKey: encryptSecret(d.apiKey as string),
        enabledEntities,
        active: d.active,
        webhookSecret: newSecret(),
        createdBy: user?.name ?? user?.email ?? null,
      },
    });
  }

  await logAudit({ action: "UPDATE", entityType: "ODOO", summary: "Updated Odoo connection" });
  revalidatePath("/settings/odoo");
  return { ok: true as const };
}

export async function testOdooConnectionAction() {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const conn = await db.odooConnection.findFirst({ where: { workspaceId: ws.id } });
  if (!conn) return { ok: false as const, error: "Save the connection first" };

  const result = await runTest(connToConfig(conn));
  await db.odooConnection.update({
    where: { id: conn.id },
    data: {
      lastTestAt: new Date(),
      lastTestOk: result.ok,
      lastTestError: result.ok ? null : result.error,
    },
  });
  revalidatePath("/settings/odoo");
  return result.ok
    ? { ok: true as const, uid: result.uid }
    : { ok: false as const, error: result.error };
}

/** One-shot two-way backfill for an entity: push all local rows, then pull. */
export async function backfillOdoo(entityType: string) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const mapper = registry.byEntityType(entityType);
  if (!mapper) return { ok: false as const, error: "Unknown entity" };

  const rows = await mapper.aywaList(ws.id);
  for (const row of rows) {
    await pushEntity(ws.id, entityType, (row as { id: string }).id);
  }
  const pull = await runOdooPull(ws.id);

  await logAudit({
    action: "OTHER",
    entityType: "ODOO",
    summary: `Backfilled ${entityType}: pushed ${rows.length}, pulled ${pull.pulled}`,
  });
  revalidatePath("/settings/odoo");
  return { ok: true as const, pushed: rows.length, pulled: pull.pulled };
}
