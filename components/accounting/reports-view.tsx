"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounting/stages";

// Local mirrors of the query shapes (queries.ts is server-only and can't be
// imported into a client component).
type TrialRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
};
type ReportLine = { code: string; name: string; amount: number };
type Section = { type: string; label: string; lines: ReportLine[]; total: number };

export type ReportsData = {
  trialBalance: { rows: TrialRow[]; totalDebit: number; totalCredit: number };
  pnl: { income: Section; expense: Section; netProfit: number };
  balanceSheet: {
    assets: Section;
    liabilities: Section;
    equity: Section;
    netIncome: number;
    totalLiabilitiesAndEquity: number;
    balanced: boolean;
  };
  currency: string;
};

const TABS = ["trial", "pnl", "balance"] as const;
type Tab = (typeof TABS)[number];

export function ReportsView({ data }: { data: ReportsData }) {
  const t = useTranslations("accounting");
  const [tab, setTab] = useState<Tab>("trial");
  const c = data.currency;

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === tb
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`reports.${tb}`)}
          </button>
        ))}
      </div>

      {tab === "trial" && <TrialBalance data={data.trialBalance} currency={c} t={t} />}
      {tab === "pnl" && <ProfitAndLoss data={data.pnl} currency={c} t={t} />}
      {tab === "balance" && <BalanceSheet data={data.balanceSheet} currency={c} t={t} />}
    </div>
  );
}

type TFn = ReturnType<typeof useTranslations>;

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden max-w-2xl">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TrialBalance({
  data,
  currency,
  t,
}: {
  data: ReportsData["trialBalance"];
  currency: string;
  t: TFn;
}) {
  const balanced = Math.abs(data.totalDebit - data.totalCredit) < 0.01;
  if (data.rows.length === 0) {
    return <EmptyReport t={t} />;
  }
  return (
    <ReportCard title={t("reports.trialTitle")}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left font-medium py-2 pl-4">{t("code")}</th>
            <th className="text-left font-medium py-2">{t("accountName")}</th>
            <th className="text-right font-medium py-2">{t("table.debit")}</th>
            <th className="text-right font-medium py-2 pr-4">{t("table.credit")}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.accountId} className="border-b last:border-0">
              <td className="py-1.5 pl-4 font-mono text-xs text-muted-foreground">{r.code}</td>
              <td className="py-1.5">{r.name}</td>
              <td className="py-1.5 text-right tabular-nums">
                {r.debit ? formatMoney(r.debit, currency) : ""}
              </td>
              <td className="py-1.5 pr-4 text-right tabular-nums">
                {r.credit ? formatMoney(r.credit, currency) : ""}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 bg-muted/30 font-semibold">
            <td className="py-2 pl-4" colSpan={2}>
              {t("reports.total")}
            </td>
            <td className="py-2 text-right tabular-nums">{formatMoney(data.totalDebit, currency)}</td>
            <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(data.totalCredit, currency)}</td>
          </tr>
        </tfoot>
      </table>
      <BalanceFlag balanced={balanced} t={t} />
    </ReportCard>
  );
}

function ProfitAndLoss({
  data,
  currency,
  t,
}: {
  data: ReportsData["pnl"];
  currency: string;
  t: TFn;
}) {
  if (data.income.lines.length === 0 && data.expense.lines.length === 0) {
    return <EmptyReport t={t} />;
  }
  const profit = data.netProfit >= 0;
  return (
    <ReportCard title={t("reports.pnlTitle")}>
      <div className="divide-y">
        <SectionBlock label={t("accountTypes.INCOME")} section={data.income} currency={currency} />
        <SectionBlock label={t("accountTypes.EXPENSE")} section={data.expense} currency={currency} />
      </div>
      <div
        className={cn(
          "flex items-center justify-between border-t-2 px-4 py-3 font-semibold",
          profit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        )}
      >
        <span>{t("reports.netProfit")}</span>
        <span className="tabular-nums">{formatMoney(data.netProfit, currency)}</span>
      </div>
    </ReportCard>
  );
}

function BalanceSheet({
  data,
  currency,
  t,
}: {
  data: ReportsData["balanceSheet"];
  currency: string;
  t: TFn;
}) {
  const hasData =
    data.assets.lines.length || data.liabilities.lines.length || data.equity.lines.length;
  if (!hasData) {
    return <EmptyReport t={t} />;
  }
  return (
    <ReportCard title={t("reports.balanceTitle")}>
      <div className="divide-y">
        <SectionBlock label={t("accountTypes.ASSET")} section={data.assets} currency={currency} />
        <div className="flex items-center justify-between border-t-2 bg-muted/20 px-4 py-2.5 font-semibold">
          <span>{t("reports.totalAssets")}</span>
          <span className="tabular-nums">{formatMoney(data.assets.total, currency)}</span>
        </div>
        <SectionBlock label={t("accountTypes.LIABILITY")} section={data.liabilities} currency={currency} />
        <SectionBlock label={t("accountTypes.EQUITY")} section={data.equity} currency={currency} />
        <div className="flex items-center justify-between px-4 py-1.5 text-sm text-muted-foreground">
          <span>{t("reports.currentEarnings")}</span>
          <span className="tabular-nums">{formatMoney(data.netIncome, currency)}</span>
        </div>
        <div className="flex items-center justify-between border-t-2 bg-muted/20 px-4 py-2.5 font-semibold">
          <span>{t("reports.totalLiabEquity")}</span>
          <span className="tabular-nums">{formatMoney(data.totalLiabilitiesAndEquity, currency)}</span>
        </div>
      </div>
      <BalanceFlag balanced={data.balanced} t={t} />
    </ReportCard>
  );
}

function SectionBlock({
  label,
  section,
  currency,
}: {
  label: string;
  section: Section;
  currency: string;
}) {
  return (
    <div className="px-4 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
        {label}
      </div>
      {section.lines.length === 0 ? (
        <div className="text-xs text-muted-foreground py-1">—</div>
      ) : (
        section.lines.map((l) => (
          <div key={l.code} className="flex items-center justify-between py-1 text-sm">
            <span>
              <span className="font-mono text-[10px] text-muted-foreground mr-2">{l.code}</span>
              {l.name}
            </span>
            <span className="tabular-nums">{formatMoney(l.amount, currency)}</span>
          </div>
        ))
      )}
    </div>
  );
}

function BalanceFlag({ balanced, t }: { balanced: boolean; t: TFn }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-t px-4 py-2 text-xs font-medium",
        balanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
      )}
    >
      {balanced ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {balanced ? t("reports.inBalance") : t("reports.notInBalance")}
    </div>
  );
}

function EmptyReport({ t }: { t: TFn }) {
  return (
    <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center max-w-2xl">
      <p className="text-sm font-medium">{t("reports.emptyTitle")}</p>
      <p className="text-xs text-muted-foreground mt-1">{t("reports.emptyHint")}</p>
    </div>
  );
}
