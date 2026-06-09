import "server-only";

import { db } from "@/lib/db";
import type { EntityMapper, OdooClient } from "../types";

// aywa Deal <-> Odoo crm.lead. Bidirectional.
//
// crm.lead holds both leads and opportunities (distinguished by `type`). Two
// relations get special handling: the linked customer (partner_id) is resolved
// via OdooLink on the OUTBOUND side only — inbound leaves aywa's contactId
// untouched (reverse contact resolution is deferred), and the pipeline stage
// (stage_id, a crm.stage relation) is resolved by NAME best-effort, since aywa
// stores stage as a string enum. Odoo wants `false` for empty scalar fields.

type DealLocal = {
  id: string;
  workspaceId: string;
  name: string;
  kind: string; // "LEAD" | "OPPORTUNITY"
  value: number;
  probability: number;
  stage: string; // NEW | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST
  notes: string | null;
  contactId: string | null;
  expectedCloseDate: Date | null;
};

// aywa stage -> Odoo crm.stage name. Odoo's default pipeline is New/Qualified/
// Proposition/Won; NEGOTIATION usually has no default stage and LOST is modelled
// as archival (active=False) rather than a stage, so both resolve best-effort
// and are simply skipped when the named stage doesn't exist.
const STAGE_NAME: Record<string, string | null> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposition",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: null,
};

// Odoo crm.stage name -> aywa stage (inbound). Accepts a couple of common
// English variants; unknown names leave the stage unset (default NEW on create).
const STAGE_FROM_NAME: Record<string, string> = {
  New: "NEW",
  Qualified: "QUALIFIED",
  Proposition: "PROPOSAL",
  Proposal: "PROPOSAL",
  Negotiation: "NEGOTIATION",
  Won: "WON",
};

function strip<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

function odooDate(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

// Resolve a crm.stage id by name (best-effort — null if the stage doesn't exist).
async function resolveStageId(client: OdooClient, name: string): Promise<number | null> {
  try {
    const hits = await client.searchRead("crm.stage", [["name", "=", name]], ["id"], { limit: 1 });
    const id = hits[0]?.id;
    return typeof id === "number" ? id : null;
  } catch {
    return null;
  }
}

export const dealMapper: EntityMapper<DealLocal> = {
  entityType: "deal",
  odooModel: "crm.lead",
  label: "Deals",
  odooFields: [
    "id",
    "name",
    "type",
    "expected_revenue",
    "probability",
    "stage_id",
    "date_deadline",
    "description",
    "write_date",
  ],

  async aywaGet(workspaceId, localId) {
    return db.deal.findFirst({ where: { id: localId, workspaceId } });
  },

  async aywaList(workspaceId, opts) {
    return db.deal.findMany({
      where: {
        workspaceId,
        ...(opts?.updatedAfter ? { updatedAt: { gt: opts.updatedAfter } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take: 500,
    });
  },

  async aywaUpsert(workspaceId, data, link) {
    if (link) {
      await db.deal.updateMany({
        where: { id: link.localId, workspaceId },
        data: strip({
          name: data.name,
          kind: data.kind,
          value: data.value,
          probability: data.probability,
          stage: data.stage,
          notes: data.notes,
          expectedCloseDate: data.expectedCloseDate,
        }),
      });
      return link.localId;
    }
    const created = await db.deal.create({
      data: {
        workspaceId,
        name: data.name ?? "Untitled",
        kind: data.kind ?? "OPPORTUNITY",
        value: data.value ?? 0,
        probability: data.probability ?? 20,
        stage: data.stage ?? "NEW",
        notes: data.notes ?? null,
        expectedCloseDate: data.expectedCloseDate ?? null,
      },
    });
    return created.id;
  },

  async buildOutbound(ctx, local) {
    const payload: Record<string, unknown> = {
      name: local.name || "Untitled",
      type: local.kind === "LEAD" ? "lead" : "opportunity",
      expected_revenue: local.value ?? 0,
      probability: local.probability ?? 0,
      description: local.notes || false,
    };
    if (local.expectedCloseDate) payload.date_deadline = odooDate(local.expectedCloseDate);

    const partnerId = await ctx.odooIdFor("contact", local.contactId);
    if (partnerId) payload.partner_id = partnerId;

    const stageName = STAGE_NAME[local.stage];
    if (stageName) {
      const stageId = await resolveStageId(ctx.client, stageName);
      if (stageId) payload.stage_id = stageId;
    }
    return payload;
  },

  fromOdoo(rec) {
    const stageName = Array.isArray(rec.stage_id) ? String(rec.stage_id[1] ?? "") : "";
    const out: Partial<DealLocal> = {
      name: typeof rec.name === "string" && rec.name ? rec.name : "Untitled",
      kind: rec.type === "lead" ? "LEAD" : "OPPORTUNITY",
      value: Number(rec.expected_revenue) || 0,
      probability: Math.round(Number(rec.probability) || 0),
      notes: rec.description ? stripHtml(String(rec.description)) || null : null,
    };
    const stage = STAGE_FROM_NAME[stageName];
    if (stage) out.stage = stage;
    if (typeof rec.date_deadline === "string" && rec.date_deadline) {
      out.expectedCloseDate = new Date(rec.date_deadline);
    }
    return out;
  },
};
