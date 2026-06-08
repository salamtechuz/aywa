import "server-only";

import { createHmac, randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { type WebhookEvent } from "./events";

export type { WebhookEvent };
export { ALL_WEBHOOK_EVENTS } from "./events";

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Fire a webhook to every endpoint in this workspace that subscribes to
 * `event`. Best-effort: failures are logged but don't throw — the calling
 * server action shouldn't be punished for a flaky third party.
 *
 * Each delivery includes:
 *   `aywa-signature: t=<ts>,v1=<hex>` — HMAC-SHA256 of `<ts>.<body>` with the
 *   endpoint's secret. Receivers verify by recomputing.
 */
export async function deliverWebhook(
  workspaceId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const endpoints = await db.webhookEndpoint.findMany({
    where: { workspaceId, active: true },
  });
  const targets = endpoints.filter((e) =>
    e.events.split(",").map((s) => s.trim()).includes(event),
  );
  if (targets.length === 0) return;

  const ts = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    id: `evt_${randomBytes(8).toString("hex")}`,
    type: event,
    created_at: new Date().toISOString(),
    workspace: workspaceId,
    data: payload,
  });

  await Promise.all(
    targets.map(async (endpoint) => {
      const signature = sign(endpoint.secret, `${ts}.${body}`);
      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "aywa-signature": `t=${ts},v1=${signature}`,
            "User-Agent": "aywa-webhooks/1.0",
          },
          body,
          // Don't wait forever for unresponsive endpoints.
          signal: AbortSignal.timeout(10_000),
        });
        await db.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: { lastFiredAt: new Date(), lastStatus: res.status },
        });
      } catch (err) {
        console.warn(`[webhook] delivery to ${endpoint.url} failed:`, err);
        await db.webhookEndpoint
          .update({
            where: { id: endpoint.id },
            data: { lastFiredAt: new Date(), lastStatus: 0 },
          })
          .catch(() => {});
      }
    }),
  );
}
