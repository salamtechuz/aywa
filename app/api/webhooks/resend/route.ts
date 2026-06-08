import { NextResponse, type NextRequest } from "next/server";
import { Webhook, WebhookVerificationError } from "svix";

import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Resend webhook ingestion. Configure in the Resend dashboard:
 *   1. Settings → Webhooks → Add endpoint
 *   2. URL: https://<yourapp>/api/webhooks/resend
 *   3. Subscribe to: email.delivered, email.opened, email.clicked,
 *      email.bounced, email.complained
 *   4. Copy the signing secret into RESEND_WEBHOOK_SECRET
 *
 * Signatures are verified with svix (same library Resend uses on their end).
 * If RESEND_WEBHOOK_SECRET is unset we accept any POST — useful for local dev
 * but DO NOT deploy that way.
 */
type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    [key: string]: unknown;
  };
};

export async function POST(req: NextRequest) {
  const raw = await req.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    // Svix signs every webhook with the headers svix-id / svix-timestamp /
    // svix-signature. Resend also sends `resend-*` aliases — accept either.
    const headers = {
      "svix-id": req.headers.get("svix-id") ?? req.headers.get("resend-id") ?? "",
      "svix-timestamp":
        req.headers.get("svix-timestamp") ?? req.headers.get("resend-timestamp") ?? "",
      "svix-signature":
        req.headers.get("svix-signature") ?? req.headers.get("resend-signature") ?? "",
    };
    if (!headers["svix-id"] || !headers["svix-timestamp"] || !headers["svix-signature"]) {
      return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
    }
    try {
      const wh = new Webhook(secret);
      wh.verify(raw, headers);
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      throw err;
    }
  }

  let payload: ResendEvent;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailId = payload.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ ok: true, ignored: "no email_id" });
  }

  const event = await db.emailEvent.findUnique({ where: { resendId: emailId } });
  if (!event) {
    // Unknown email — could be from a different env / not from our flow.
    // Acknowledge so Resend stops retrying.
    return NextResponse.json({ ok: true, ignored: "unknown email" });
  }

  const now = new Date();

  switch (payload.type) {
    case "email.opened":
      await db.emailEvent.update({
        where: { id: event.id },
        data: {
          openedAt: event.openedAt ?? now,
          openCount: { increment: 1 },
        },
      });
      break;
    case "email.clicked":
      await db.emailEvent.update({
        where: { id: event.id },
        data: {
          clickedAt: event.clickedAt ?? now,
          clickCount: { increment: 1 },
        },
      });
      break;
    case "email.bounced":
      await db.emailEvent.update({
        where: { id: event.id },
        data: { bouncedAt: now },
      });
      break;
    case "email.complained":
      await db.emailEvent.update({
        where: { id: event.id },
        data: { complainedAt: now },
      });
      break;
    case "email.delivered":
    case "email.sent":
    default:
      // No-op on the row beyond what we already saved when sending.
      break;
  }

  return NextResponse.json({ ok: true });
}
