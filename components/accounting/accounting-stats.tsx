import { BookCheck, FileClock, ListTree, Scale } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { StatCard } from "@/components/patterns/stat-card";
import { formatMoney } from "@/lib/accounting/stages";

type Props = {
  stats: {
    draftCount: number;
    postedCount: number;
    accountCount: number;
    postedTotal: number;
  };
  currency: string;
};

export async function AccountingStats({ stats, currency }: Props) {
  const t = await getTranslations("accounting");
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard
        label={t("stats.postedTotal")}
        value={formatMoney(stats.postedTotal, currency)}
        icon={Scale}
        hint={t("stats.postedTotalHint")}
      />
      <StatCard
        label={t("stats.postedEntries")}
        value={String(stats.postedCount)}
        icon={BookCheck}
      />
      <StatCard
        label={t("stats.draftEntries")}
        value={String(stats.draftCount)}
        icon={FileClock}
      />
      <StatCard
        label={t("stats.accounts")}
        value={String(stats.accountCount)}
        icon={ListTree}
      />
    </div>
  );
}
