import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";
import { TokenForm, type TokenRow } from "./token-form";
import { WebhookForm, type WebhookRow } from "./webhook-form";

export const metadata = { title: "Settings · Developer" };
export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  const t = await getTranslations("settings");
  const ws = await getActiveWorkspace();
  const [tokens, webhooks] = await Promise.all([
    db.apiToken.findMany({
      where: { workspaceId: ws.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    db.webhookEndpoint.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const tokenRows: TokenRow[] = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scope: t.scope,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
    lastUsedAt: t.lastUsedAt,
  }));

  const webhookRows: WebhookRow[] = webhooks.map((w) => ({
    id: w.id,
    url: w.url,
    events: w.events.split(",").map((s) => s.trim()).filter(Boolean),
    active: w.active,
    lastFiredAt: w.lastFiredAt,
    lastStatus: w.lastStatus,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("apiTokens")}</CardTitle>
          <CardDescription>
            {t.rich("apiTokensDescription", {
              code: (chunks) => (
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{chunks}</code>
              ),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TokenForm tokens={tokenRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("outboundWebhooks")}</CardTitle>
          <CardDescription>
            {t.rich("outboundWebhooksDescription", {
              code: (chunks) => (
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{chunks}</code>
              ),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookForm webhooks={webhookRows} />
        </CardContent>
      </Card>
    </div>
  );
}
