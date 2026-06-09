import "server-only";

import { db } from "@/lib/db";
import type { EntityMapper } from "../types";

// aywa Vendor -> Odoo res.partner (flagged as a supplier). OUTBOUND ONLY.
//
// Vendors and Contacts are separate aywa tables that both map to res.partner,
// so this mapper is pull:false — inbound res.partner records flow to Contacts
// only (the contact mapper owns res.partner on the inbound side). Outbound we
// push vendors as company partners with supplier_rank set, deduping against an
// existing partner by email (then name) so we don't create twins of a contact
// that already exists in Odoo.

type VendorLocal = {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export const vendorMapper: EntityMapper<VendorLocal> = {
  entityType: "vendor",
  odooModel: "res.partner",
  label: "Vendors",
  pull: false, // res.partner inbound is owned by the contact mapper
  odooFields: ["id", "name", "email", "phone", "write_date"],

  async aywaGet(workspaceId, localId) {
    return db.vendor.findFirst({ where: { id: localId, workspaceId } });
  },

  async aywaList(workspaceId, opts) {
    return db.vendor.findMany({
      where: {
        workspaceId,
        ...(opts?.updatedAfter ? { updatedAt: { gt: opts.updatedAfter } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take: 500,
    });
  },

  toOdoo(local) {
    return {
      name: local.name,
      email: local.email || false,
      phone: local.phone || false,
      is_company: true,
      supplier_rank: 1,
    };
  },

  async matchOdoo(client, local) {
    const domain = local.email ? [["email", "=", local.email]] : [["name", "=", local.name]];
    const hits = await client.searchRead("res.partner", domain, ["id"], { limit: 1 });
    const id = hits[0]?.id;
    return typeof id === "number" ? id : null;
  },
};
