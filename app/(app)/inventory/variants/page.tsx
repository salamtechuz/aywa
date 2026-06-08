import { Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Product Variants" };

export default async function ProductVariantsPage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={Layers}
      title={t("soon.variantsTitle")}
      description={t("soon.variantsDesc")}
      features={t.raw("soon.variantsFeatures") as string[]}
    />
  );
}
