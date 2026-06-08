import { Route } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Routes" };

export default async function RoutesPage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={Route}
      title={t("soon.routesTitle")}
      description={t("soon.routesDesc")}
      features={t.raw("soon.routesFeatures") as string[]}
    />
  );
}
