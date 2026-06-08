import { CheckCircle2, Factory, Hammer, ListTree } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { StatCard } from "@/components/patterns/stat-card";

type Props = {
  stats: {
    openCount: number;
    inProgressCount: number;
    doneCount: number;
    bomCount: number;
  };
};

export async function ManufacturingStats({ stats }: Props) {
  const t = await getTranslations("manufacturing");
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard label={t("stats.open")} value={String(stats.openCount)} icon={Factory} hint={t("stats.openHint")} />
      <StatCard label={t("stats.inProgress")} value={String(stats.inProgressCount)} icon={Hammer} />
      <StatCard label={t("stats.done")} value={String(stats.doneCount)} icon={CheckCircle2} />
      <StatCard label={t("stats.boms")} value={String(stats.bomCount)} icon={ListTree} />
    </div>
  );
}
