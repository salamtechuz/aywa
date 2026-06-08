import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { getActiveWorkspace } from "@/lib/tenant";
import {
  getBalanceSheet,
  getProfitAndLoss,
  getTrialBalance,
  listLedgerAccounts,
} from "@/lib/accounting/queries";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { ReportsView } from "@/components/accounting/reports-view";
import { EmptyAccounting } from "@/components/accounting/empty-accounting";

export const metadata = { title: "Accounting Reports" };

export default async function AccountingReportsPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("accounting");

  const accounts = await listLedgerAccounts(ws.id);
  const needsSetup = accounts.length === 0;

  const [trialBalance, pnl, balanceSheet] = needsSetup
    ? [null, null, null]
    : await Promise.all([
        getTrialBalance(ws.id),
        getProfitAndLoss(ws.id),
        getBalanceSheet(ws.id),
      ]);

  return (
    <>
      <PageHeader title={t("reportsTitle")} description={t("reportsDescription")} />
      <AccountingNav />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {needsSetup || !trialBalance || !pnl || !balanceSheet ? (
          <EmptyAccounting />
        ) : (
          <ReportsView
            data={{
              trialBalance,
              pnl,
              balanceSheet,
              currency: ws.defaultCurrency,
            }}
          />
        )}
      </div>
    </>
  );
}
