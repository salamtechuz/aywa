import "server-only";

import { db } from "@/lib/db";
import type { EntityMapper, OdooClient } from "../types";

// aywa JournalEntry -> Odoo account.move (a generic journal entry, move_type
// "entry"). OUTBOUND ONLY. We create Odoo moves as DRAFT (we never auto-post —
// posting validates balance/config and is best left to the user in Odoo).
//
// IMPORTANT — this mapper depends on the chart of accounts matching: each aywa
// JournalEntryLine's account is resolved in Odoo by `code` (account.account),
// and the journal is the first Odoo "general" journal. aywa seeds generic codes
// (1000/4000/…); a real Odoo uses a localization-specific chart, so codes will
// usually NOT match until they're aligned. When any line's account can't be
// resolved the whole entry is skipped (a partial move would be unbalanced).
// This is the one module that cannot be finished without a live Odoo chart.

type JeLineLocal = {
  debit: number;
  credit: number;
  description: string | null;
  account: { code: string };
};

type JeLocal = {
  id: string;
  workspaceId: string;
  number: string;
  date: Date;
  reference: string | null;
  journal: { type: string };
  lines: JeLineLocal[];
};

function odooDate(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// First Odoo "general"/miscellaneous journal — the right book for move_type entry.
async function resolveGeneralJournal(client: OdooClient): Promise<number | null> {
  const hits = await client.searchRead("account.journal", [["type", "=", "general"]], ["id"], {
    limit: 1,
    order: "id",
  });
  const id = hits[0]?.id;
  return typeof id === "number" ? id : null;
}

async function resolveAccountId(client: OdooClient, code: string): Promise<number | null> {
  if (!code) return null;
  const hits = await client.searchRead("account.account", [["code", "=", code]], ["id"], {
    limit: 1,
  });
  const id = hits[0]?.id;
  return typeof id === "number" ? id : null;
}

const WITH_LINES_AND_JOURNAL = {
  journal: { select: { type: true } },
  lines: {
    include: { account: { select: { code: true } } },
    orderBy: { position: "asc" as const },
  },
};

export const journalEntryMapper: EntityMapper<JeLocal> = {
  entityType: "journal_entry",
  odooModel: "account.move",
  label: "Journal entries",
  pull: false,
  odooFields: ["id", "name", "ref", "state", "write_date"],

  async aywaGet(workspaceId, localId) {
    return db.journalEntry.findFirst({
      where: { id: localId, workspaceId },
      include: WITH_LINES_AND_JOURNAL,
    });
  },

  async aywaList(workspaceId) {
    return db.journalEntry.findMany({
      where: { workspaceId },
      include: WITH_LINES_AND_JOURNAL,
      orderBy: { updatedAt: "asc" },
      take: 500,
    });
  },

  async matchOdoo(client, local) {
    const hits = await client.searchRead("account.move", [["ref", "=", local.number]], ["id"], {
      limit: 1,
    });
    const id = hits[0]?.id;
    return typeof id === "number" ? id : null;
  },

  async buildOutbound(ctx, local) {
    const journalId = await resolveGeneralJournal(ctx.client);
    if (!journalId) return null; // no general journal in Odoo — can't create a move

    const lineCmds: unknown[] = [];
    for (const ln of local.lines) {
      const accountId = await resolveAccountId(ctx.client, ln.account.code);
      if (!accountId) return null; // unmapped account → skip the whole (now unbalanced) entry
      lineCmds.push([
        0,
        0,
        {
          account_id: accountId,
          name: ln.description || local.reference || local.number,
          debit: ln.debit,
          credit: ln.credit,
        },
      ]);
    }
    if (lineCmds.length < 2) return null;

    return {
      move_type: "entry",
      ref: local.reference || local.number,
      date: odooDate(local.date),
      journal_id: journalId,
      line_ids: ctx.mode === "update" ? [[5, 0, 0], ...lineCmds] : lineCmds,
    };
  },
};
