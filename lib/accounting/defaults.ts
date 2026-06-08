import "server-only";

import { db } from "@/lib/db";

// The default chart of accounts + journals seeded into a workspace via the
// in-app "Create default chart of accounts" action. prisma/seed.ts inlines the
// same data for fresh demo workspaces. Account codes here must include the ones
// referenced by DEFAULT_ACCOUNTS in stages.ts.

export type DefaultAccount = {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
};

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  // Assets (1000–1999)
  { code: "1000", name: "Cash", type: "ASSET" },
  { code: "1010", name: "Bank", type: "ASSET" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET" },
  { code: "1200", name: "Inventory", type: "ASSET" },
  { code: "1500", name: "Fixed Assets", type: "ASSET" },
  // Liabilities (2000–2999)
  { code: "2100", name: "Accounts Payable", type: "LIABILITY" },
  { code: "2200", name: "Taxes Payable", type: "LIABILITY" },
  // Equity (3000–3999)
  { code: "3000", name: "Owner's Equity", type: "EQUITY" },
  { code: "3900", name: "Retained Earnings", type: "EQUITY" },
  // Income (4000–4999)
  { code: "4000", name: "Sales Revenue", type: "INCOME" },
  { code: "4100", name: "Other Income", type: "INCOME" },
  // Expenses (5000–5999)
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
  { code: "5100", name: "Salaries & Wages", type: "EXPENSE" },
  { code: "5200", name: "Rent", type: "EXPENSE" },
  { code: "5300", name: "Utilities", type: "EXPENSE" },
  { code: "5900", name: "Other Expenses", type: "EXPENSE" },
];

export type DefaultJournal = {
  code: string;
  name: string;
  type: "SALE" | "PURCHASE" | "BANK" | "CASH" | "GENERAL";
};

export const DEFAULT_JOURNALS: DefaultJournal[] = [
  { code: "SAL", name: "Customer Invoices", type: "SALE" },
  { code: "PUR", name: "Vendor Bills", type: "PURCHASE" },
  { code: "BNK", name: "Bank", type: "BANK" },
  { code: "CSH", name: "Cash", type: "CASH" },
  { code: "MISC", name: "Miscellaneous Operations", type: "GENERAL" },
];

/**
 * Create the default chart + journals for a workspace, skipping any account/
 * journal `code` that already exists (idempotent). Returns how many of each
 * were created.
 */
export async function ensureDefaultAccounting(workspaceId: string, currency = "USD") {
  const existingAccounts = await db.ledgerAccount.findMany({
    where: { workspaceId },
    select: { code: true },
  });
  const existingAccountCodes = new Set(existingAccounts.map((a) => a.code));

  let accountsCreated = 0;
  for (const a of DEFAULT_CHART_OF_ACCOUNTS) {
    if (existingAccountCodes.has(a.code)) continue;
    await db.ledgerAccount.create({
      data: {
        workspaceId,
        code: a.code,
        name: a.name,
        type: a.type,
        currency,
      },
    });
    accountsCreated++;
  }

  const existingJournals = await db.journal.findMany({
    where: { workspaceId },
    select: { code: true },
  });
  const existingJournalCodes = new Set(existingJournals.map((j) => j.code));

  let journalsCreated = 0;
  for (const j of DEFAULT_JOURNALS) {
    if (existingJournalCodes.has(j.code)) continue;
    await db.journal.create({
      data: { workspaceId, code: j.code, name: j.name, type: j.type },
    });
    journalsCreated++;
  }

  return { accountsCreated, journalsCreated };
}
