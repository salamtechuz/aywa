"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

function generatePortalToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Returns (creating if missing) a public-portal URL for the given order.
 * The token never expires — revoke via the "Reset portal link" action below.
 */
export async function getOrCreatePortalLink(
  orderId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const denied = await assertCanWrite();
  if (denied) return { ok: false, error: denied.error };
  const ws = await getActiveWorkspace();

  const order = await db.salesOrder.findFirst({
    where: { id: orderId, workspaceId: ws.id },
  });
  if (!order) return { ok: false, error: "Order not found" };

  let token = order.portalToken;
  if (!token) {
    token = generatePortalToken();
    await db.salesOrder.update({
      where: { id: orderId },
      data: { portalToken: token },
    });
  }
  const origin = process.env.AUTH_URL || "http://localhost:3000";
  revalidatePath("/sales");
  return { ok: true, url: `${origin}/portal/${token}` };
}

export async function resetPortalLink(orderId: string) {
  const denied = await assertCanWrite();
  if (denied) return { ok: false as const, error: denied.error };
  const ws = await getActiveWorkspace();
  const token = generatePortalToken();
  await db.salesOrder.updateMany({
    where: { id: orderId, workspaceId: ws.id },
    data: { portalToken: token },
  });
  revalidatePath("/sales");
  return { ok: true as const, token };
}
