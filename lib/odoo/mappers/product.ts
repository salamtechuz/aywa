import "server-only";

import { db } from "@/lib/db";
import type { EntityMapper } from "../types";

// aywa Product <-> Odoo product.template.
//
// We sync the catalog scalars only: name, internal reference (SKU), sales
// price, cost, and description. Two aywa fields are intentionally NOT mapped in
// this phase because Odoo models them as many2one relations, not free text:
//   - aywa `category` <-> Odoo categ_id (product.category)
//   - aywa `unit`     <-> Odoo uom_id   (uom.uom)
// Mapping those needs a category/UoM resolver; new aywa products land in Odoo's
// default category and "Units" UoM until a later phase. Stock levels are NOT
// synced here either (qty_available is computed in Odoo) — that is the stock
// phase. Odoo wants `false` (not null/"") for empty scalar fields.

type ProductLocal = {
  id: string;
  workspaceId: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
};

function strip<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

export const productMapper: EntityMapper<ProductLocal> = {
  entityType: "product",
  odooModel: "product.template",
  label: "Products",
  odooFields: [
    "id",
    "name",
    "default_code",
    "list_price",
    "standard_price",
    "description",
    "write_date",
  ],

  async aywaGet(workspaceId, localId) {
    return db.product.findFirst({ where: { id: localId, workspaceId } });
  },

  async aywaList(workspaceId, opts) {
    return db.product.findMany({
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
      // SKU is aywa's stable unique key — never churn it from inbound data.
      await db.product.updateMany({
        where: { id: link.localId, workspaceId },
        data: strip({
          name: data.name,
          description: data.description,
          price: data.price,
          cost: data.cost,
        }),
      });
      return link.localId;
    }
    const created = await db.product.create({
      data: {
        workspaceId,
        sku: data.sku ?? `ODOO-${Date.now()}`,
        name: data.name ?? "Unnamed",
        description: data.description ?? null,
        price: data.price ?? 0,
        cost: data.cost ?? 0,
        unit: "each",
      },
    });
    return created.id;
  },

  toOdoo(local) {
    return {
      name: local.name,
      default_code: local.sku || false,
      list_price: local.price ?? 0,
      standard_price: local.cost ?? 0,
      description: local.description || false,
    };
  },

  fromOdoo(rec) {
    const code = rec.default_code ? String(rec.default_code) : null;
    const price = Number(rec.list_price);
    const cost = Number(rec.standard_price);
    return {
      sku: code ?? `ODOO-${rec.id}`,
      name: typeof rec.name === "string" && rec.name ? rec.name : "Unnamed",
      description: rec.description ? String(rec.description) : null,
      price: Number.isFinite(price) ? price : 0,
      cost: Number.isFinite(cost) ? cost : 0,
    };
  },

  async matchOdoo(client, local) {
    if (!local.sku) return null;
    const hits = await client.searchRead(
      "product.template",
      [["default_code", "=", local.sku]],
      ["id"],
      { limit: 1 },
    );
    const id = hits[0]?.id;
    return typeof id === "number" ? id : null;
  },

  async matchLocal(workspaceId, rec) {
    if (!rec.default_code) return null;
    const hit = await db.product.findFirst({
      where: { workspaceId, sku: String(rec.default_code) },
      select: { id: true },
    });
    return hit?.id ?? null;
  },
};
