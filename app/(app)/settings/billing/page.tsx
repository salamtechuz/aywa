import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getActiveWorkspace } from "@/lib/tenant";

const PLANS = [
  {
    id: "FREE",
    price: "$0",
    featureKeys: ["oneWorkspace", "upTo3Members", "coreModules", "communitySupport"],
  },
  {
    id: "PRO",
    price: "$29",
    featureKeys: ["unlimitedMembers", "allModules", "customReports", "emailChatSupport"],
    highlight: true,
  },
  {
    id: "ENTERPRISE",
    price: null,
    featureKeys: ["ssoScim", "auditLog", "dedicatedManager", "sla"],
  },
];

export const metadata = { title: "Settings · Billing" };

export default async function BillingPage() {
  const t = await getTranslations("settings");
  const workspace = await getActiveWorkspace();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan")}</CardTitle>
          <CardDescription>
            {t.rich("currentPlanDescription", {
              badge: () => (
                <Badge variant="outline" className="font-mono">
                  {workspace.plan}
                </Badge>
              ),
            })}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 pt-3">
        {PLANS.map((p) => {
          const current = p.id === workspace.plan;
          const currentIndex = PLANS.findIndex((x) => x.id === workspace.plan);
          const thisIndex = PLANS.findIndex((x) => x.id === p.id);
          const planName = t(`plans.${p.id}`);
          const action =
            thisIndex > currentIndex
              ? t("upgradeTo", { plan: planName })
              : t("switchTo", { plan: planName });
          return (
            <div key={p.id} className="relative">
              {p.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 shadow-sm">
                  {t("mostPopular")}
                </Badge>
              )}
              <Card
                className={cn(
                  "flex flex-col h-full",
                  p.highlight && "border-primary ring-1 ring-primary/20",
                )}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{planName}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-semibold text-foreground">
                      {p.price ?? t("priceCustom")}
                    </span>
                    <span className="ml-1 text-xs">{t(`cadence.${p.id}`)}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <ul className="space-y-2 text-sm flex-1">
                    {p.featureKeys.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{t(`features.${f}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={current ? "outline" : p.highlight ? "default" : "outline"}
                    disabled={current}
                    className="w-full"
                  >
                    {current ? t("currentPlanButton") : action}
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
