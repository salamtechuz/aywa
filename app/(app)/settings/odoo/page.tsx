import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { entityMeta } from "@/lib/odoo/registry";
import { getActiveWorkspace } from "@/lib/tenant";

import { OdooConnectionForm, type OdooSettings } from "./connection-form";

export const metadata = { title: "Settings · Odoo" };
export const dynamic = "force-dynamic";

export default async function OdooSettingsPage() {
  const ws = await getActiveWorkspace();
  const [conn, linkGroups] = await Promise.all([
    db.odooConnection.findFirst({ where: { workspaceId: ws.id } }),
    db.odooLink.groupBy({
      by: ["entityType"],
      where: { workspaceId: ws.id },
      _count: { _all: true },
    }),
  ]);

  const linkCounts: Record<string, number> = {};
  for (const g of linkGroups) linkCounts[g.entityType] = g._count._all;

  const base = (process.env.AUTH_URL ?? "").replace(/\/+$/, "");
  const settings: OdooSettings = {
    baseUrl: conn?.baseUrl ?? "",
    db: conn?.db ?? "",
    username: conn?.username ?? "",
    hasKey: Boolean(conn?.apiKey),
    active: conn?.active ?? false,
    enabledEntities: conn?.enabledEntities
      ? conn.enabledEntities.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    lastTestAt: conn?.lastTestAt ? conn.lastTestAt.toISOString() : null,
    lastTestOk: conn?.lastTestOk ?? null,
    lastTestError: conn?.lastTestError ?? null,
    lastPullAt: conn?.lastPullAt ?? null,
    webhookUrl: base && conn ? `${base}/api/webhooks/odoo?ws=${ws.id}` : null,
    webhookSecret: conn?.webhookSecret ?? null,
    linkCounts,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Odoo integration</CardTitle>
          <CardDescription>
            Two-way sync between aywa and your Odoo instance. Enter the connection, choose which
            data syncs, and test it. Records flow aywa → Odoo on change, and Odoo → aywa via the
            optional webhook plus the periodic sync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OdooConnectionForm settings={settings} entities={entityMeta()} />
        </CardContent>
      </Card>
    </div>
  );
}
