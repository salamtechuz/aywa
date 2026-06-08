import { BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Moves Analysis" };

export default async function MovesAnalysisPage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={BarChart3}
      title={t("soon.movesAnalysisTitle")}
      description={t("soon.movesAnalysisDesc")}
      features={t.raw("soon.movesAnalysisFeatures") as string[]}
    />
  );
}
