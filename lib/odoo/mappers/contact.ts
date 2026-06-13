import "server-only";

import { db } from "@/lib/db";
import type { EntityMapper } from "../types";

// aywa Contact <-> Odoo res.partner.
//
// res.partner is companies AND people (distinguished by is_company), and is NOT
// crm.lead. Odoo wants `false` (not null/"") for empty scalar fields. The free
// `company` text on a person maps to res.partner.company_name.

type ContactLocal = {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string; // "PERSON" | "COMPANY"
};

function strip<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

export const contactMapper: EntityMapper<ContactLocal> = {
  entityType: "contact",
  odooModel: "res.partner",
  label: "Contacts",
  odooFields: ["id", "name", "email", "phone", "is_company", "company_name", "write_date"],

  async aywaGet(workspaceId, localId) {
    return db.contact.findFirst({ where: { id: localId, workspaceId } });
  },

  async aywaList(workspaceId, opts) {
    return db.contact.findMany({
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
      await db.contact.updateMany({
        where: { id: link.localId, workspaceId },
        data: strip({
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          type: data.type,
        }),
      });
      return link.localId;
    }
    const created = await db.contact.create({
      data: {
        workspaceId,
        name: data.name ?? "Unnamed",
        email: data.email ?? null,
        phone: data.phone ?? null,
        company: data.company ?? null,
        type: data.type ?? "PERSON",
      },
    });
    return created.id;
  },

  toOdoo(local) {
    return {
      name: local.name,
      email: local.email || false,
      phone: local.phone || false,
      is_company: local.type === "COMPANY",
      company_name: local.company || false,
    };
  },

  fromOdoo(rec) {
    return {
      name: typeof rec.name === "string" && rec.name ? rec.name : "Unnamed",
      email: rec.email ? String(rec.email) : null,
      phone: rec.phone ? String(rec.phone) : null,
      company: rec.company_name ? String(rec.company_name) : null,
      type: rec.is_company ? "COMPANY" : "PERSON",
    };
  },

  async matchOdoo(client, local) {
    if (!local.email) return null;
    const hits = await client.searchRead("res.partner", [["email", "=", local.email]], ["id"], {
      limit: 1,
    });
    const id = hits[0]?.id;
    return typeof id === "number" ? id : null;
  },

  async matchLocal(workspaceId, rec) {
    if (!rec.email) return null;
    const hit = await db.contact.findFirst({
      where: { workspaceId, email: String(rec.email) },
      select: { id: true },
    });
    return hit?.id ?? null;
  },
};
