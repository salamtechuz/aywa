// Shared constants + helpers for the Accounting module. Status/type values are
// stored as TEXT and validated at the app layer (no native DB enums), exactly
// like the other modules. Money here uses 2 decimal places — accounting needs
// cent precision, unlike the rounded display used in Sales/Purchase.

/// Account types. `side` is the normal balance side used to turn raw debit/
/// credit sums into a signed balance, and `report` is where the account rolls
/// up: balance sheet (ASSET/LIABILITY/EQUITY) or P&L (INCOME/EXPENSE).
export const ACCOUNT_TYPES = [
  { id: "ASSET", label: "Asset", side: "DEBIT", report: "BALANCE_SHEET", accent: "var(--chart-1)" },
  { id: "LIABILITY", label: "Liability", side: "CREDIT", report: "BALANCE_SHEET", accent: "var(--chart-2)" },
  { id: "EQUITY", label: "Equity", side: "CREDIT", report: "BALANCE_SHEET", accent: "var(--chart-3)" },
  { id: "INCOME", label: "Income", side: "CREDIT", report: "PNL", accent: "var(--success)" },
  { id: "EXPENSE", label: "Expense", side: "DEBIT", report: "PNL", accent: "var(--chart-4)" },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["id"];
export const ACCOUNT_TYPE_IDS = ACCOUNT_TYPES.map((t) => t.id) as [AccountType, ...AccountType[]];

export function accountTypeMeta(type: string) {
  return ACCOUNT_TYPES.find((t) => t.id === type) ?? ACCOUNT_TYPES[0];
}

/// The "normal balance" of an account: signed (debit − credit) for DEBIT-side
/// accounts (assets, expenses), or (credit − debit) for CREDIT-side accounts
/// (liabilities, equity, income).
export function normalBalance(type: string, debit: number, credit: number) {
  return accountTypeMeta(type).side === "DEBIT" ? debit - credit : credit - debit;
}

/// Journals. `type` drives auto-entry routing (SALE for customer invoices,
/// PURCHASE for vendor bills); the rest are for manual bookkeeping.
export const JOURNAL_TYPES = [
  { id: "SALE", label: "Sales" },
  { id: "PURCHASE", label: "Purchases" },
  { id: "BANK", label: "Bank" },
  { id: "CASH", label: "Cash" },
  { id: "GENERAL", label: "Miscellaneous" },
] as const;

export type JournalType = (typeof JOURNAL_TYPES)[number]["id"];
export const JOURNAL_TYPE_IDS = JOURNAL_TYPES.map((t) => t.id) as [JournalType, ...JournalType[]];

export function journalTypeLabel(type: string) {
  return JOURNAL_TYPES.find((t) => t.id === type)?.label ?? type;
}

/// Entry lifecycle. DRAFT is editable and excluded from reports; POSTED hits
/// the ledger; CANCELLED is a posted entry that was voided.
export const ENTRY_STATUSES = [
  { id: "DRAFT", label: "Draft", accent: "var(--muted-foreground)" },
  { id: "POSTED", label: "Posted", accent: "var(--success)" },
  { id: "CANCELLED", label: "Cancelled", accent: "var(--destructive)" },
] as const;

export type EntryStatus = (typeof ENTRY_STATUSES)[number]["id"];
export const ENTRY_STATUS_IDS = ENTRY_STATUSES.map((s) => s.id) as [EntryStatus, ...EntryStatus[]];

export function entryStatusMeta(status: string) {
  return ENTRY_STATUSES.find((s) => s.id === status) ?? ENTRY_STATUSES[0];
}

/// Default account codes the auto-entry generator looks up. Seeded into every
/// workspace's chart of accounts; if a code is missing, auto-entry is skipped.
export const DEFAULT_ACCOUNTS = {
  RECEIVABLE: "1100", // Accounts Receivable (ASSET)
  REVENUE: "4000", // Sales Revenue (INCOME)
  PAYABLE: "2100", // Accounts Payable (LIABILITY)
  EXPENSE: "5000", // Cost of Goods Sold / Purchases (EXPENSE)
} as const;

/// Money formatter with cent precision. Defaults to USD; pass the workspace or
/// entry currency for correct symbols.
export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/// Float money comparison tolerant of binary rounding (entries balance when
/// debit and credit agree to the cent).
export function isBalanced(totalDebit: number, totalCredit: number) {
  return Math.abs(totalDebit - totalCredit) < 0.005;
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
