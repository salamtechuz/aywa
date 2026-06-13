import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { applyOdooRecord } from "@/lib/odoo/sync";

export const runtime = "nodejs";

// Inbound receiver for Odoo → aywa. An Odoo Automation Rule (or server action)
// POSTs `{ model, res_id }` here on create/write. The target workspace is
// identified by ?ws=<workspaceId> and authenticated by a shared secret
// (OdooConnection.webhookSecret) — mirrors the stripe/resend 401-on-bad-sig.

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("ws") ?? "";
  if (!workspaceId) {
    return NextResponse.json({ error: "Missing ws" }, { status: 400 });
  }

  const conn = await db.odooConnection.findFirst({ where: { workspaceId, active: true } });
  if (!conn) {
    return NextResponse.json({ error: "No active Odoo connection" }, { status: 404 });
  }

  // Verify the shared secret unless none is configured (dev convenience).
  if (conn.webhookSecret) {
    const provided = req.headers.get("x-odoo-secret") ?? url.searchParams.get("secret") ?? "";
    if (!provided || !safeEqual(provided, conn.webhookSecret)) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }
  }

  let body: { model?: string; res_id?: number | string; id?: number | string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const model = body.model;
  const rawId = body.res_id ?? body.id;
  const odooId = typeof rawId === "number" ? rawId : Number(rawId);
  if (!model || !Number.isFinite(odooId)) {
    return NextResponse.json({ ok: true, ignored: "missing model/res_id" });
  }

  try {
    const applied = await applyOdooRecord(workspaceId, model, odooId);
    return NextResponse.json({ ok: true, applied });
  } catch (err) {
    console.warn("[odoo] inbound webhook apply failed:", err);
    // Acknowledge anyway so Odoo stops retrying; the pull cron reconciles later.
    return NextResponse.json({ ok: true, applied: false });
  }
}
