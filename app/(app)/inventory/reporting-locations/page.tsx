import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Stock by Location" };

export default async function ReportLocationsPage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={MapPin}
      title={t("soon.reportLocationsTitle")}
      description={t("soon.reportLocationsDesc")}
      features={t.raw("soon.reportLocationsFeatures") as string[]}
    />
  );
}
