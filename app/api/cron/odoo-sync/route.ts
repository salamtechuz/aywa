import { NextResponse, type NextRequest } from "next/server";

import { runOdooPullAll } from "@/lib/odoo/sync";

export const runtime = "nodejs";

// Reliable backbone for Odoo → aywa: pulls records changed since each
// connection's write_date cursor and applies them. The inbound webhook gives
// near-real-time; this cron is the catch-up for missed/failed deliveries.
//
// Gated by `Authorization: Bearer $CRON_SECRET` (same as recurring-invoices).
// On the self-hosted VPS, wire it with a server crontab hitting this endpoint —
// vercel.json crons do NOT run there.

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runOdooPullAll();
  return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
}
