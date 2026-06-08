"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { MiniArea, MiniBars, MiniDonut } from "@/components/brand/preview-charts";
import { ShortcutHint } from "@/components/patterns/shortcut";

type ModuleKey = "dashboard" | "crm" | "sales" | "inventory" | "reports";

const MODULES: { key: ModuleKey; navKey: string; icon: typeof Users }[] = [
  { key: "dashboard", navKey: "dashboard", icon: LayoutDashboard },
  { key: "crm", navKey: "crm", icon: Users },
  { key: "sales", navKey: "salesModule", icon: ShoppingCart },
  { key: "inventory", navKey: "inventory", icon: Package },
  { key: "reports", navKey: "reports", icon: BarChart3 },
];

// [labelKey, value] — labels are translated, values are language-neutral.
const STATS: Record<ModuleKey, [string, string][]> = {
  dashboard: [["revenue", "$84.2k"], ["openOrders", "128"], ["customers", "312"]],
  crm: [["pipeline", "$112k"], ["wonMo", "18"], ["leads", "64"]],
  sales: [["orders", "1,284"], ["revenue", "$84.2k"], ["avgOrder", "$312"]],
  inventory: [["skus", "642"], ["lowStock", "12"], ["stockValue", "$58k"]],
  reports: [["margin", "38%"], ["growth", "+12%"], ["churn", "2.1%"]],
};

// Each data-heavy tab gets its OWN chart type (see preview-charts.tsx).
const DASHBOARD_BARS = [38, 56, 44, 70, 52, 78, 62, 88, 74, 94, 68, 82];
const SALES_TREND = [30, 45, 38, 58, 50, 70, 62, 84, 76, 95];
const REPORTS_SEGMENTS = [
  { value: 42, color: "var(--chart-1)" },
  { value: 28, color: "var(--chart-2)" },
  { value: 18, color: "var(--chart-3)" },
  { value: 12, color: "var(--chart-4)" },
];

const DEALS: { name: string; stage: keyof typeof STAGE_COLOR; value: string }[] = [
  { name: "Acme Corp", stage: "won", value: "$32k" },
  { name: "Globex", stage: "proposal", value: "$24k" },
  { name: "Initech", stage: "negotiation", value: "$41k" },
  { name: "Umbrella Co", stage: "qualified", value: "$15k" },
];

const STAGE_COLOR = {
  won: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  proposal: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  negotiation: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  qualified: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
} as const;

const PRODUCTS: { name: string; pct: number; units: string }[] = [
  { name: "Widget Pro", pct: 92, units: "1,204" },
  { name: "Adapter X", pct: 64, units: "512" },
  { name: "Cable 2m", pct: 28, units: "38" },
  { name: "Mount Kit", pct: 9, units: "7" },
];

export function PreviewApp() {
  const t = useTranslations("landing.demo");
  const tl = useTranslations("landing");
  const tn = useTranslations("nav");
  const [active, setActive] = useState<ModuleKey>("dashboard");

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-2xl ring-1 ring-foreground/10">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-foreground/10 bg-foreground/[0.03] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-destructive/70" />
        <span className="h-3 w-3 rounded-full bg-warning/70" />
        <span className="h-3 w-3 rounded-full bg-success/70" />
        <div className="ml-4 hidden sm:block w-full max-w-xs">
          <div className="flex items-center gap-2 rounded-md border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            <span>{tl("previewSearch")}</span>
            <kbd className="ml-auto rounded border border-foreground/15 bg-foreground/5 px-1.5 text-[10px]">
              <ShortcutHint />
            </kbd>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar — clickable module tabs */}
        <aside className="hidden w-44 shrink-0 flex-col gap-1 border-r border-foreground/10 bg-foreground/[0.02] p-3 sm:flex">
          {MODULES.map((m) => {
            const on = m.key === active;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setActive(m.key)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                  on
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                <m.icon className="h-3.5 w-3.5" />
                {tn(m.navKey)}
              </button>
            );
          })}
        </aside>

        {/* Content — swaps per active module. No `key` remount: switching tabs
            updates in place (fast), and the bars morph smoothly to new heights
            instead of tearing down + rebuilding the whole subtree. */}
        <div className="flex-1 space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-3">
            {STATS[active].map(([labelKey, value], i) => (
              <div
                key={labelKey}
                className="rounded-xl border border-foreground/10 bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t(`labels.${labelKey}`)}
                </div>
                <div className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
                  {value}
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="meter-rise h-full w-2/3 rounded-full bg-gradient-to-r from-primary/70 to-primary will-change-transform"
                    style={{ animationDelay: `${i * 90 + 150}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Visualization — a DIFFERENT chart type per module. */}
          {active === "dashboard" && <MiniBars data={DASHBOARD_BARS} />}
          {active === "sales" && <MiniArea data={SALES_TREND} />}
          {active === "reports" && <MiniDonut segments={REPORTS_SEGMENTS} />}

          {active === "crm" && (
            <div className="divide-y divide-foreground/5 rounded-xl border border-foreground/10 bg-foreground/[0.03]">
              {DEALS.map((d) => (
                <div key={d.name} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                  <span className="font-medium">{d.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      STAGE_COLOR[d.stage],
                    )}
                  >
                    {t(`stages.${d.stage}`)}
                  </span>
                  <span className="ml-auto tabular-nums text-muted-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          )}

          {active === "inventory" && (
            <div className="space-y-2.5 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
              {PRODUCTS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 text-xs">
                  <span className="w-24 shrink-0 truncate font-medium">{p.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className={cn(
                        "meter-rise h-full rounded-full will-change-transform",
                        p.pct < 15 ? "bg-destructive" : "bg-primary",
                      )}
                      style={{ width: `${p.pct}%`, animationDelay: `${i * 80 + 150}ms` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                    {p.units} {t("labels.units")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
