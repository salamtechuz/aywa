import { Gauge } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Performance" };

export default async function PerformancePage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={Gauge}
      title={t("soon.performanceTitle")}
      description={t("soon.performanceDesc")}
      features={t.raw("soon.performanceFeatures") as string[]}
    />
  );
}
