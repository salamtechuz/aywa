import { PackageCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Putaway Rules" };

export default async function PutawayRulesPage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={PackageCheck}
      title={t("soon.putawayTitle")}
      description={t("soon.putawayDesc")}
      features={t.raw("soon.putawayFeatures") as string[]}
    />
  );
}
