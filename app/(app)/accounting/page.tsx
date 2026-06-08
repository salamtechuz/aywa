import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { round2 } from "@/lib/accounting/stages";
import {
  getAccountingStats,
  listJournalEntries,
  listJournals,
  listLedgerAccounts,
} from "@/lib/accounting/queries";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { AccountingStats } from "@/components/accounting/accounting-stats";
import { EntriesTable } from "@/components/accounting/entries-table";
import { EntryDialog } from "@/components/accounting/entry-dialog";
import { EmptyAccounting } from "@/components/accounting/empty-accounting";
import type { AccountOption, EntryRow, JournalOption } from "@/components/accounting/types";

export const metadata = { title: "Accounting" };

export default async function AccountingPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("accounting");

  const [accounts, journals, rawEntries, stats] = await Promise.all([
    listLedgerAccounts(ws.id, { activeOnly: true }),
    listJournals(ws.id, { activeOnly: true }),
    listJournalEntries(ws.id),
    getAccountingStats(ws.id),
  ]);

  const accountOptions: AccountOption[] = accounts.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
  }));
  const journalOptions: JournalOption[] = journals.map((j) => ({
    id: j.id,
    code: j.code,
    name: j.name,
    type: j.type,
  }));

  const entries: EntryRow[] = rawEntries.map((e) => {
    const totalDebit = round2(e.lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = round2(e.lines.reduce((s, l) => s + l.credit, 0));
    return {
      id: e.id,
      number: e.number,
      date: e.date,
      reference: e.reference,
      status: e.status,
      currency: e.currency,
      sourceType: e.sourceType,
      createdBy: e.createdBy,
      journalId: e.journalId,
      journal: e.journal,
      lines: e.lines.map((l) => ({
        accountId: l.accountId,
        account: l.account,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
      })),
      totalDebit,
      totalCredit,
    };
  });

  const needsSetup = accounts.length === 0;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {t("doubleEntry")}
          </Badge>
        }
        actions={
          !needsSetup ? (
            <EntryDialog
              accounts={accountOptions}
              journals={journalOptions}
              defaultCurrency={ws.defaultCurrency}
            />
          ) : undefined
        }
      />
      <AccountingNav />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        {needsSetup ? (
          <EmptyAccounting />
        ) : (
          <>
            <AccountingStats stats={stats} currency={ws.defaultCurrency} />
            {entries.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
                <p className="text-sm font-medium">{t("noEntriesYet")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("noEntriesHint")}</p>
              </div>
            ) : (
              <EntriesTable
                entries={entries}
                accounts={accountOptions}
                journals={journalOptions}
                defaultCurrency={ws.defaultCurrency}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
