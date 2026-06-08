"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";
import { ACCOUNT_TYPE_IDS, JOURNAL_TYPE_IDS, isBalanced, round2 } from "@/lib/accounting/stages";
import { nextJournalEntryNumber } from "@/lib/accounting/queries";
import { ensureDefaultAccounting } from "@/lib/accounting/defaults";

// ---------- Setup ----------

export async function seedDefaultChartOfAccounts() {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const result = await ensureDefaultAccounting(ws.id, ws.defaultCurrency);
  await logAudit({
    action: "CREATE",
    entityType: "ACCOUNT",
    summary: `Seeded default chart of accounts (${result.accountsCreated} accounts, ${result.journalsCreated} journals)`,
  });
  revalidatePath("/accounting/chart");
  revalidatePath("/accounting");
  return { ok: true as const, ...result };
}

// ---------- Chart of accounts ----------

const AccountSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(ACCOUNT_TYPE_IDS),
  currency: z.string().trim().min(1).default("USD"),
  description: z.string().optional(),
});

export async function createAccount(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = AccountSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const dupe = await db.ledgerAccount.findFirst({
    where: { workspaceId: ws.id, code: d.code },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Account code ${d.code} already exists` };

  const created = await db.ledgerAccount.create({
    data: {
      workspaceId: ws.id,
      code: d.code,
      name: d.name,
      type: d.type,
      currency: d.currency || "USD",
      description: d.description || null,
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "ACCOUNT",
    entityId: created.id,
    summary: `Created account ${d.code} ${d.name}`,
  });
  revalidatePath("/accounting/chart");
  return { ok: true as const, id: created.id };
}

const UpdateAccountSchema = AccountSchema.extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateAccount(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateAccountSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...d } = parsed.data;
  const dupe = await db.ledgerAccount.findFirst({
    where: { workspaceId: ws.id, code: d.code, NOT: { id } },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Account code ${d.code} already exists` };

  await db.ledgerAccount.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      code: d.code,
      name: d.name,
      type: d.type,
      currency: d.currency || "USD",
      description: d.description || null,
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  revalidatePath("/accounting/chart");
  return { ok: true as const };
}

export async function deleteAccount(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const inUse = await db.journalEntryLine.count({
    where: { accountId: id, account: { workspaceId: ws.id } },
  });
  if (inUse > 0) {
    return { ok: false as const, error: "Account is used by journal entries — deactivate it instead" };
  }
  await db.ledgerAccount.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/accounting/chart");
  return { ok: true as const };
}

// ---------- Journals ----------

const JournalSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(JOURNAL_TYPE_IDS).default("GENERAL"),
});

export async function createJournal(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = JournalSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const dupe = await db.journal.findFirst({
    where: { workspaceId: ws.id, code: d.code },
    select: { id: true },
  });
  if (dupe) return { ok: false as const, error: `Journal code ${d.code} already exists` };

  const created = await db.journal.create({
    data: { workspaceId: ws.id, code: d.code, name: d.name, type: d.type },
  });
  revalidatePath("/accounting/chart");
  return { ok: true as const, id: created.id };
}

export async function deleteJournal(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const inUse = await db.journalEntry.count({ where: { journalId: id, workspaceId: ws.id } });
  if (inUse > 0) {
    return { ok: false as const, error: "Journal has entries — it cannot be deleted" };
  }
  await db.journal.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/accounting/chart");
  return { ok: true as const };
}

// ---------- Journal entries ----------

const EntryLineInput = z.object({
  accountId: z.string().min(1),
  description: z.string().optional().nullable(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
});

const CreateEntrySchema = z.object({
  journalId: z.string().min(1, "Journal is required"),
  date: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(["DRAFT", "POSTED"]).default("DRAFT"),
  lines: z.array(EntryLineInput),
});

/** Drop blank lines and validate the debit/credit shape. */
function normalizeLines(lines: z.infer<typeof EntryLineInput>[]) {
  const clean = lines
    .map((l) => ({
      accountId: l.accountId,
      description: l.description || null,
      debit: round2(l.debit || 0),
      credit: round2(l.credit || 0),
    }))
    .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
  const totalDebit = round2(clean.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(clean.reduce((s, l) => s + l.credit, 0));
  return { clean, totalDebit, totalCredit };
}

export async function createEntry(input: z.infer<typeof CreateEntrySchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const parsed = CreateEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // Journal must belong to this workspace.
  const journal = await db.journal.findFirst({
    where: { id: d.journalId, workspaceId: ws.id },
    select: { id: true },
  });
  if (!journal) return { ok: false as const, error: "Journal not found" };

  const { clean, totalDebit, totalCredit } = normalizeLines(d.lines);
  if (clean.length < 2) {
    return { ok: false as const, error: "An entry needs at least two lines" };
  }
  if (d.status === "POSTED") {
    if (totalDebit <= 0) return { ok: false as const, error: "Entry total must be greater than zero" };
    if (!isBalanced(totalDebit, totalCredit)) {
      return { ok: false as const, error: "Debits and credits must balance before posting" };
    }
  }

  const number = await nextJournalEntryNumber(ws.id);
  const created = await db.journalEntry.create({
    data: {
      workspaceId: ws.id,
      journalId: d.journalId,
      number,
      date: d.date ? new Date(d.date) : new Date(),
      reference: d.reference || null,
      status: d.status,
      currency: ws.defaultCurrency,
      sourceType: "MANUAL",
      postedAt: d.status === "POSTED" ? new Date() : null,
      createdBy: user?.name ?? user?.email ?? null,
      lines: {
        create: clean.map((l, i) => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          position: i,
        })),
      },
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "JOURNAL_ENTRY",
    entityId: created.id,
    summary: `Created journal entry ${number}${d.status === "POSTED" ? " (posted)" : ""}`,
  });
  revalidatePath("/accounting");
  return { ok: true as const, id: created.id, number };
}

const UpdateEntrySchema = CreateEntrySchema.extend({ id: z.string().min(1) });

export async function updateEntry(input: z.infer<typeof UpdateEntrySchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const entry = await db.journalEntry.findFirst({
    where: { id: d.id, workspaceId: ws.id },
    select: { status: true, sourceType: true },
  });
  if (!entry) return { ok: false as const, error: "Entry not found" };
  if (entry.status !== "DRAFT") {
    return { ok: false as const, error: "Only draft entries can be edited — un-post it first" };
  }

  const { clean, totalDebit, totalCredit } = normalizeLines(d.lines);
  if (clean.length < 2) {
    return { ok: false as const, error: "An entry needs at least two lines" };
  }
  if (d.status === "POSTED") {
    if (totalDebit <= 0) return { ok: false as const, error: "Entry total must be greater than zero" };
    if (!isBalanced(totalDebit, totalCredit)) {
      return { ok: false as const, error: "Debits and credits must balance before posting" };
    }
  }

  await db.$transaction([
    db.journalEntryLine.deleteMany({ where: { entryId: d.id } }),
    db.journalEntry.update({
      where: { id: d.id },
      data: {
        journalId: d.journalId,
        date: d.date ? new Date(d.date) : new Date(),
        reference: d.reference || null,
        status: d.status,
        postedAt: d.status === "POSTED" ? new Date() : null,
        lines: {
          create: clean.map((l, i) => ({
            accountId: l.accountId,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
            position: i,
          })),
        },
      },
    }),
  ]);
  revalidatePath("/accounting");
  return { ok: true as const };
}

export async function postEntry(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const entry = await db.journalEntry.findFirst({
    where: { id, workspaceId: ws.id },
    include: { lines: { select: { debit: true, credit: true } } },
  });
  if (!entry) return { ok: false as const, error: "Entry not found" };
  if (entry.status === "POSTED") return { ok: true as const };

  const totalDebit = round2(entry.lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(entry.lines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit <= 0) return { ok: false as const, error: "Entry total must be greater than zero" };
  if (!isBalanced(totalDebit, totalCredit)) {
    return { ok: false as const, error: "Debits and credits must balance before posting" };
  }

  await db.journalEntry.updateMany({
    where: { id, workspaceId: ws.id },
    data: { status: "POSTED", postedAt: new Date() },
  });
  await logAudit({
    action: "STATUS_CHANGE",
    entityType: "JOURNAL_ENTRY",
    entityId: id,
    summary: `Posted journal entry ${entry.number}`,
  });
  revalidatePath("/accounting");
  return { ok: true as const };
}

export async function unpostEntry(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const entry = await db.journalEntry.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true, sourceType: true, number: true },
  });
  if (!entry) return { ok: false as const, error: "Entry not found" };
  if (entry.sourceType && entry.sourceType !== "MANUAL") {
    return { ok: false as const, error: "Auto-generated entries are managed by their source document" };
  }
  await db.journalEntry.updateMany({
    where: { id, workspaceId: ws.id },
    data: { status: "DRAFT", postedAt: null },
  });
  revalidatePath("/accounting");
  return { ok: true as const };
}

export async function deleteEntry(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const entry = await db.journalEntry.findFirst({
    where: { id, workspaceId: ws.id },
    select: { status: true, sourceType: true },
  });
  if (!entry) return { ok: false as const, error: "Entry not found" };
  if (entry.sourceType && entry.sourceType !== "MANUAL") {
    return { ok: false as const, error: "Auto-generated entries are managed by their source document" };
  }
  if (entry.status === "POSTED") {
    return { ok: false as const, error: "Posted entries cannot be deleted — un-post it first" };
  }
  await db.journalEntry.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/accounting");
  return { ok: true as const };
}
