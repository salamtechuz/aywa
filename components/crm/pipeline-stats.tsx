"use client";

import { DollarSign, Target, Trophy, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatCard } from "@/components/patterns/stat-card";
import { formatMoney } from "@/lib/crm/stages";
import type { DealCardData } from "./deal-card";

export function PipelineStats({ deals }: { deals: DealCardData[] }) {
  const t = useTranslations("crm");
  const open = deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const won = deals.filter((d) => d.stage === "WON");
  const lost = deals.filter((d) => d.stage === "LOST");

  const pipelineValue = open.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = open.reduce(
    (sum, d) => sum + d.value * (d.probability / 100),
    0,
  );
  const wonValue = won.reduce((sum, d) => sum + d.value, 0);
  const closedTotal = won.length + lost.length;
  const winRate = closedTotal === 0 ? 0 : (won.length / closedTotal) * 100;

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={t("stats.openPipeline")}
        value={formatMoney(pipelineValue)}
        hint={t("stats.dealsCount", { count: open.length })}
        icon={DollarSign}
      />
      <StatCard
        label={t("stats.weightedForecast")}
        value={formatMoney(weightedValue)}
        hint={t("stats.probAdjusted")}
        icon={Target}
      />
      <StatCard
        label={t("stats.won")}
        value={formatMoney(wonValue)}
        hint={t("stats.dealsCount", { count: won.length })}
        icon={Trophy}
      />
      <StatCard
        label={t("stats.winRate")}
        value={`${winRate.toFixed(0)}%`}
        hint={t("stats.wonLost", { won: won.length, lost: lost.length })}
        icon={TrendingUp}
      />
    </div>
  );
}
