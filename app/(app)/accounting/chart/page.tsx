import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listJournalsWithUsage, listLedgerAccountsWithUsage } from "@/lib/accounting/queries";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { AccountsTable } from "@/components/accounting/accounts-table";
import { AccountDialog } from "@/components/accounting/account-dialog";
import { JournalDialog } from "@/components/accounting/journal-dialog";
import { EmptyAccounting } from "@/components/accounting/empty-accounting";
import type { AccountRow, JournalRow } from "@/components/accounting/types";

export const metadata = { title: "Chart of Accounts" };

export default async function ChartOfAccountsPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("accounting");

  const [accountsRaw, journalsRaw] = await Promise.all([
    listLedgerAccountsWithUsage(ws.id),
    listJournalsWithUsage(ws.id),
  ]);

  const accounts: AccountRow[] = accountsRaw.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    currency: a.currency,
    description: a.description,
    active: a.active,
    usageCount: a._count.lines,
  }));
  const journals: JournalRow[] = journalsRaw.map((j) => ({
    id: j.id,
    code: j.code,
    name: j.name,
    type: j.type,
    usageCount: j._count.entries,
  }));

  const needsSetup = accounts.length === 0;

  return (
    <>
      <PageHeader
        title={t("chartTitle")}
        description={t("chartDescription")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {accounts.length}
          </Badge>
        }
        actions={
          !needsSetup ? (
            <div className="flex items-center gap-2">
              <JournalDialog />
              <AccountDialog defaultCurrency={ws.defaultCurrency} />
            </div>
          ) : undefined
        }
      />
      <AccountingNav />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {needsSetup ? (
          <EmptyAccounting />
        ) : (
          <AccountsTable
            accounts={accounts}
            journals={journals}
            defaultCurrency={ws.defaultCurrency}
          />
        )}
      </div>
    </>
  );
}
