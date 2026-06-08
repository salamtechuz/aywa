import "server-only";

import { db } from "@/lib/db";
import { DEFAULT_ACCOUNTS, round2 } from "@/lib/accounting/stages";
import {
  getJournalByType,
  getLedgerAccountByCode,
  nextJournalEntryNumber,
} from "@/lib/accounting/queries";

// Auto-generated journal entries mirror the inventory stock sync: the first
// time a document enters an "entry-affecting" status we POST a balanced entry
// (idempotent — keyed by sourceType+sourceId); when it leaves that status we
// remove the entry. All of this is best-effort and never throws, so a
// workspace that hasn't set up its chart of accounts still uses Sales/Purchase
// normally.

const ENTRY_AFFECTING_SALES = new Set(["INVOICED"]);
const ENTRY_AFFECTING_PURCHASE = new Set(["BILLED"]);

async function existingSourceEntry(
  workspaceId: string,
  sourceType: string,
  sourceId: string,
) {
  return db.journalEntry.findFirst({
    where: { workspaceId, sourceType, sourceId },
    select: { id: true },
  });
}

async function removeSourceEntry(
  workspaceId: string,
  sourceType: string,
  sourceId: string,
) {
  // Delete any draft/posted auto entry for this source. Lines cascade.
  await db.journalEntry.deleteMany({ where: { workspaceId, sourceType, sourceId } });
}

/**
 * Call after a Sales Order's status changes. Idempotent for a given
 * (oldStatus, newStatus). On INVOICED: Dr Accounts Receivable / Cr Revenue.
 */
export async function syncEntryForSalesOrder(
  workspaceId: string,
  orderId: string,
  oldStatus: string | null,
  newStatus: string,
  ownerName?: string,
) {
  try {
    const was = oldStatus !== null && ENTRY_AFFECTING_SALES.has(oldStatus);
    const is = ENTRY_AFFECTING_SALES.has(newStatus);
    if (was === is) return;

    if (is) {
      if (await existingSourceEntry(workspaceId, "SALES_ORDER", orderId)) return;
      const order = await db.salesOrder.findFirst({
        where: { id: orderId, workspaceId },
        select: { number: true, amount: true, currency: true },
      });
      if (!order || order.amount <= 0) return;

      const [journal, ar, revenue] = await Promise.all([
        getJournalByType(workspaceId, "SALE"),
        getLedgerAccountByCode(workspaceId, DEFAULT_ACCOUNTS.RECEIVABLE),
        getLedgerAccountByCode(workspaceId, DEFAULT_ACCOUNTS.REVENUE),
      ]);
      if (!journal || !ar || !revenue) return; // chart of accounts not set up

      const amount = round2(order.amount);
      await createPostedEntry({
        workspaceId,
        journalId: journal.id,
        currency: order.currency,
        reference: `Invoice ${order.number}`,
        sourceType: "SALES_ORDER",
        sourceId: orderId,
        ownerName,
        lines: [
          { accountId: ar.id, debit: amount, credit: 0, description: `Invoice ${order.number}` },
          { accountId: revenue.id, debit: 0, credit: amount, description: `Invoice ${order.number}` },
        ],
      });
    } else {
      await removeSourceEntry(workspaceId, "SALES_ORDER", orderId);
    }
  } catch (err) {
    console.error("[accounting] syncEntryForSalesOrder failed", err);
  }
}

/**
 * Call after a Purchase Order's status changes. On BILLED: Dr Expense /
 * Cr Accounts Payable.
 */
export async function syncEntryForPurchaseOrder(
  workspaceId: string,
  orderId: string,
  oldStatus: string | null,
  newStatus: string,
  ownerName?: string,
) {
  try {
    const was = oldStatus !== null && ENTRY_AFFECTING_PURCHASE.has(oldStatus);
    const is = ENTRY_AFFECTING_PURCHASE.has(newStatus);
    if (was === is) return;

    if (is) {
      if (await existingSourceEntry(workspaceId, "PURCHASE_ORDER", orderId)) return;
      const order = await db.purchaseOrder.findFirst({
        where: { id: orderId, workspaceId },
        select: { number: true, amount: true, currency: true },
      });
      if (!order || order.amount <= 0) return;

      const [journal, expense, ap] = await Promise.all([
        getJournalByType(workspaceId, "PURCHASE"),
        getLedgerAccountByCode(workspaceId, DEFAULT_ACCOUNTS.EXPENSE),
        getLedgerAccountByCode(workspaceId, DEFAULT_ACCOUNTS.PAYABLE),
      ]);
      if (!journal || !expense || !ap) return;

      const amount = round2(order.amount);
      await createPostedEntry({
        workspaceId,
        journalId: journal.id,
        currency: order.currency,
        reference: `Bill ${order.number}`,
        sourceType: "PURCHASE_ORDER",
        sourceId: orderId,
        ownerName,
        lines: [
          { accountId: expense.id, debit: amount, credit: 0, description: `Bill ${order.number}` },
          { accountId: ap.id, debit: 0, credit: amount, description: `Bill ${order.number}` },
        ],
      });
    } else {
      await removeSourceEntry(workspaceId, "PURCHASE_ORDER", orderId);
    }
  } catch (err) {
    console.error("[accounting] syncEntryForPurchaseOrder failed", err);
  }
}

type NewLine = { accountId: string; debit: number; credit: number; description?: string };

async function createPostedEntry(args: {
  workspaceId: string;
  journalId: string;
  currency: string;
  reference: string;
  sourceType: string;
  sourceId: string;
  ownerName?: string;
  lines: NewLine[];
}) {
  const number = await nextJournalEntryNumber(args.workspaceId);
  await db.journalEntry.create({
    data: {
      workspaceId: args.workspaceId,
      journalId: args.journalId,
      number,
      reference: args.reference,
      status: "POSTED",
      currency: args.currency,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      postedAt: new Date(),
      createdBy: args.ownerName ?? null,
      lines: {
        create: args.lines.map((l, i) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description ?? null,
          position: i,
        })),
      },
    },
  });
}
