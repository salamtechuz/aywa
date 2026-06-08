import "server-only";

import { db } from "@/lib/db";
import { ACCOUNT_TYPES, normalBalance } from "@/lib/accounting/stages";

// ---------- Chart of accounts ----------

export async function listLedgerAccounts(
  workspaceId: string,
  opts?: { activeOnly?: boolean },
) {
  return db.ledgerAccount.findMany({
    where: {
      workspaceId,
      ...(opts?.activeOnly ? { active: true } : {}),
    },
    orderBy: { code: "asc" },
  });
}

export async function listLedgerAccountsWithUsage(workspaceId: string) {
  return db.ledgerAccount.findMany({
    where: { workspaceId },
    include: { _count: { select: { lines: true } } },
    orderBy: { code: "asc" },
  });
}

export async function getLedgerAccountByCode(workspaceId: string, code: string) {
  return db.ledgerAccount.findFirst({ where: { workspaceId, code } });
}

// ---------- Journals ----------

export async function listJournals(
  workspaceId: string,
  opts?: { activeOnly?: boolean },
) {
  return db.journal.findMany({
    where: {
      workspaceId,
      ...(opts?.activeOnly ? { active: true } : {}),
    },
    orderBy: { code: "asc" },
  });
}

export async function listJournalsWithUsage(workspaceId: string) {
  return db.journal.findMany({
    where: { workspaceId },
    include: { _count: { select: { entries: true } } },
    orderBy: { code: "asc" },
  });
}

/** First active journal of a given type — used by auto-entry routing. */
export async function getJournalByType(workspaceId: string, type: string) {
  return db.journal.findFirst({
    where: { workspaceId, type, active: true },
    orderBy: { code: "asc" },
  });
}

// ---------- Journal entries ----------

export async function listJournalEntries(
  workspaceId: string,
  opts?: { status?: string; limit?: number },
) {
  return db.journalEntry.findMany({
    where: {
      workspaceId,
      ...(opts?.status ? { status: opts.status } : {}),
    },
    include: {
      journal: { select: { code: true, name: true, type: true } },
      lines: {
        select: {
          accountId: true,
          debit: true,
          credit: true,
          description: true,
          account: { select: { code: true, name: true, type: true } },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    ...(opts?.limit ? { take: opts.limit } : {}),
  });
}

export async function getJournalEntry(workspaceId: string, id: string) {
  return db.journalEntry.findFirst({
    where: { id, workspaceId },
    include: {
      journal: true,
      lines: {
        include: { account: true },
        orderBy: { position: "asc" },
      },
    },
  });
}

export async function nextJournalEntryNumber(workspaceId: string) {
  const last = await db.journalEntry.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const lastNum = last?.number?.replace(/\D/g, "");
  const next = lastNum ? parseInt(lastNum, 10) + 1 : 1;
  return `JE-${String(next).padStart(4, "0")}`;
}

// ---------- Reports ----------
// All reports sum POSTED entry lines only. Optional date filters bound the
// period (P&L is a flow over [from, to]; balance sheet / trial balance are
// snapshots as of `to`).

type DateRange = { from?: Date; to?: Date };

function entryDateWhere(range?: DateRange) {
  if (!range?.from && !range?.to) return {};
  return {
    date: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

/** Raw debit/credit totals per account for POSTED entries. */
async function postedSumsByAccount(workspaceId: string, range?: DateRange) {
  const grouped = await db.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      entry: { workspaceId, status: "POSTED", ...entryDateWhere(range) },
    },
    _sum: { debit: true, credit: true },
  });
  const map = new Map<string, { debit: number; credit: number }>();
  for (const g of grouped) {
    map.set(g.accountId, {
      debit: g._sum.debit ?? 0,
      credit: g._sum.credit ?? 0,
    });
  }
  return map;
}

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number; // signed normal balance
};

export async function getTrialBalance(
  workspaceId: string,
  range?: DateRange,
): Promise<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number }> {
  const [accounts, sums] = await Promise.all([
    listLedgerAccounts(workspaceId),
    postedSumsByAccount(workspaceId, range),
  ]);

  const rows: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  for (const a of accounts) {
    const s = sums.get(a.id);
    if (!s) continue; // skip accounts with no movement
    const debit = s.debit;
    const credit = s.credit;
    if (debit === 0 && credit === 0) continue;
    totalDebit += debit;
    totalCredit += credit;
    rows.push({
      accountId: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      debit,
      credit,
      balance: normalBalance(a.type, debit, credit),
    });
  }
  return { rows, totalDebit, totalCredit };
}

export type ReportLine = { code: string; name: string; amount: number };
export type ReportSection = { type: string; label: string; lines: ReportLine[]; total: number };

async function sectionsByType(workspaceId: string, range?: DateRange) {
  const [accounts, sums] = await Promise.all([
    listLedgerAccounts(workspaceId),
    postedSumsByAccount(workspaceId, range),
  ]);
  const byType = new Map<string, ReportLine[]>();
  for (const a of accounts) {
    const s = sums.get(a.id);
    if (!s) continue;
    const amount = normalBalance(a.type, s.debit, s.credit);
    if (amount === 0) continue;
    const arr = byType.get(a.type) ?? [];
    arr.push({ code: a.code, name: a.name, amount });
    byType.set(a.type, arr);
  }
  return byType;
}

export async function getProfitAndLoss(workspaceId: string, range?: DateRange) {
  const byType = await sectionsByType(workspaceId, range);
  const build = (type: string): ReportSection => {
    const meta = ACCOUNT_TYPES.find((t) => t.id === type)!;
    const lines = (byType.get(type) ?? []).sort((a, b) => a.code.localeCompare(b.code));
    return {
      type,
      label: meta.label,
      lines,
      total: lines.reduce((s, l) => s + l.amount, 0),
    };
  };
  const income = build("INCOME");
  const expense = build("EXPENSE");
  return {
    income,
    expense,
    netProfit: income.total - expense.total,
  };
}

export async function getBalanceSheet(workspaceId: string, range?: DateRange) {
  // Balance sheet is a snapshot as of `to`; ignore a `from` bound.
  const snapshot: DateRange = { to: range?.to };
  const byType = await sectionsByType(workspaceId, snapshot);
  const build = (type: string): ReportSection => {
    const meta = ACCOUNT_TYPES.find((t) => t.id === type)!;
    const lines = (byType.get(type) ?? []).sort((a, b) => a.code.localeCompare(b.code));
    return {
      type,
      label: meta.label,
      lines,
      total: lines.reduce((s, l) => s + l.amount, 0),
    };
  };
  const assets = build("ASSET");
  const liabilities = build("LIABILITY");
  const equity = build("EQUITY");

  // Current-period net income is part of equity but lives in P&L accounts; add
  // it so the sheet balances (Assets = Liabilities + Equity + Net income).
  const pnl = await getProfitAndLoss(workspaceId, snapshot);
  const equityPlusEarnings = equity.total + pnl.netProfit;

  return {
    assets,
    liabilities,
    equity,
    netIncome: pnl.netProfit,
    totalLiabilitiesAndEquity: liabilities.total + equityPlusEarnings,
    balanced: Math.abs(assets.total - (liabilities.total + equityPlusEarnings)) < 0.01,
  };
}

// ---------- Stats (entries page header) ----------

export async function getAccountingStats(workspaceId: string) {
  const [draft, posted, accountCount, postedAgg] = await Promise.all([
    db.journalEntry.count({ where: { workspaceId, status: "DRAFT" } }),
    db.journalEntry.count({ where: { workspaceId, status: "POSTED" } }),
    db.ledgerAccount.count({ where: { workspaceId, active: true } }),
    db.journalEntryLine.aggregate({
      where: { entry: { workspaceId, status: "POSTED" } },
      _sum: { debit: true },
    }),
  ]);
  return {
    draftCount: draft,
    postedCount: posted,
    accountCount,
    postedTotal: postedAgg._sum.debit ?? 0,
  };
}
