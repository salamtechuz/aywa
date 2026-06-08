import { SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Reordering Rules" };

export default async function RulesPage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={SlidersHorizontal}
      title={t("soon.rulesTitle")}
      description={t("soon.rulesDesc")}
      features={t.raw("soon.rulesFeatures") as string[]}
    />
  );
}
