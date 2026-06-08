import { PackageOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Packages" };

export default async function PackagesPage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={PackageOpen}
      title={t("soon.packagesTitle")}
      description={t("soon.packagesDesc")}
      features={t.raw("soon.packagesFeatures") as string[]}
    />
  );
}
