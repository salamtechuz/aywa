import { getTranslations } from "next-intl/server";
import { getActiveWorkspace } from "@/lib/tenant";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClearSampleButton } from "../clear-sample-button";
import { WorkspaceForm } from "./workspace-form";

export const metadata = { title: "Settings · General" };
export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const t = await getTranslations("settings");
  const workspace = await getActiveWorkspace();

  const sampleCount = await db.deal.count({
    where: { workspaceId: workspace.id, notes: { startsWith: "[example]" } },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("workspace")}</CardTitle>
          <CardDescription>
            {t("workspaceDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceForm
            workspace={{
              name: workspace.name,
              slug: workspace.slug,
              logo: workspace.logo,
              accentColor: workspace.accentColor,
              defaultCurrency: workspace.defaultCurrency,
            }}
          />
        </CardContent>
      </Card>

      {sampleCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sampleData")}</CardTitle>
            <CardDescription>
              {t("sampleDataDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">
                {t("sampleDataCount", { count: sampleCount })}
              </div>
              <ClearSampleButton />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
          <CardDescription>{t("dangerZoneDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <div className="font-medium text-sm">{t("deleteWorkspace")}</div>
              <div className="text-sm text-muted-foreground">
                {t("deleteWorkspaceDescription")}
              </div>
            </div>
            <Button variant="destructive" disabled>
              {t("deleteWorkspace")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
