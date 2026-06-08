// Shared, serializable shapes passed from the accounting server pages into the
// client components. Dates cross the RSC boundary fine (Next serializes them).

export type AccountOption = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export type JournalOption = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export type EntryLineData = {
  accountId: string;
  account: { code: string; name: string; type: string } | null;
  description: string | null;
  debit: number;
  credit: number;
};

export type EntryRow = {
  id: string;
  number: string;
  date: Date;
  reference: string | null;
  status: string;
  currency: string;
  sourceType: string | null;
  createdBy: string | null;
  journalId: string;
  journal: { code: string; name: string; type: string };
  lines: EntryLineData[];
  totalDebit: number;
  totalCredit: number;
};

export type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  description: string | null;
  active: boolean;
  usageCount: number;
};

export type JournalRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  usageCount: number;
};
