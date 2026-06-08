import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ComingSoonModule } from "@/components/patterns/coming-soon";

export const metadata = { title: "Inventory Settings" };

export default async function InventorySettingsPage() {
  const t = await getTranslations("inventory");
  return (
    <ComingSoonModule
      icon={Settings2}
      title={t("soon.settingsTitle")}
      description={t("soon.settingsDesc")}
      features={t.raw("soon.settingsFeatures") as string[]}
    />
  );
}
