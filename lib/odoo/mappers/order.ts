import "server-only";

import { db } from "@/lib/db";
import type { EntityMapper, OdooClient } from "../types";

// aywa SalesOrder -> Odoo sale.order. OUTBOUND ONLY (pull: false).
//
// We push aywa quotes/orders into Odoo but do NOT auto-create aywa orders from
// Odoo: inbound needs aywa-number generation plus reverse resolution of the
// partner and every line's product, which we defer to a later phase. Outbound
// resolves the customer (partner_id) and each line's product (product_id) via
// OdooLink, pushing those dependencies to Odoo first if they aren't linked yet
// (see OutboundCtx.odooIdFor). The aywa order number is stamped onto Odoo's
// client_order_ref, which doubles as the dedup key.

type OrderLineLocal = {
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

type OrderLocal = {
  id: string;
  workspaceId: string;
  number: string;
  customerId: string | null;
  status: string;
  orderDate: Date;
  notes: string | null;
  lines: OrderLineLocal[];
};

// aywa status -> Odoo sale.order.state. state is a stored selection and is
// ORM-writable; we mirror status rather than driving Odoo's confirm workflow.
const STATE_BY_STATUS: Record<string, string> = {
  DRAFT: "draft",
  SENT: "sent",
  CONFIRMED: "sale",
  DELIVERED: "sale",
  INVOICED: "sale",
  CANCELLED: "cancel",
};

// Odoo stores datetimes as naive UTC "YYYY-MM-DD HH:MM:SS".
function odooDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// sale.order.line.product_uom is required. Product lines auto-compute it from
// the product on create (Odoo 16+), but free-text lines (no product) need one
// explicitly — resolve the base "Units" UoM once per push, lazily.
async function unitsUomId(client: OdooClient): Promise<number | null> {
  try {
    const id = await client.callKw("ir.model.data", "xmlid_to_res_id", [
      "uom.product_uom_unit",
    ]);
    if (typeof id === "number" && id) return id;
  } catch {
    // fall through to a generic lookup
  }
  try {
    const hits = await client.searchRead("uom.uom", [], ["id"], { limit: 1, order: "id" });
    const id = hits[0]?.id;
    if (typeof id === "number") return id;
  } catch {
    // give up — product-less lines may then error and be caught per-order
  }
  return null;
}

const WITH_LINES = { lines: { orderBy: { position: "asc" as const } } };

export const salesOrderMapper: EntityMapper<OrderLocal> = {
  entityType: "order",
  odooModel: "sale.order",
  label: "Sales orders",
  pull: false, // outbound-only for now
  odooFields: ["id", "name", "client_order_ref", "state", "write_date"],

  async aywaGet(workspaceId, localId) {
    return db.salesOrder.findFirst({
      where: { id: localId, workspaceId },
      include: WITH_LINES,
    });
  },

  async aywaList(workspaceId) {
    return db.salesOrder.findMany({
      where: { workspaceId },
      include: WITH_LINES,
      orderBy: { updatedAt: "asc" },
      take: 500,
    });
  },

  // Dedup by the aywa order number we stamp on client_order_ref, so a re-run of
  // backfill links to the existing Odoo order instead of duplicating it.
  async matchOdoo(client, local) {
    const hits = await client.searchRead(
      "sale.order",
      [["client_order_ref", "=", local.number]],
      ["id"],
      { limit: 1 },
    );
    const id = hits[0]?.id;
    return typeof id === "number" ? id : null;
  },

  async buildOutbound(ctx, local) {
    const partnerId = await ctx.odooIdFor("contact", local.customerId);
    // sale.order can't be created without a customer — skip until resolvable.
    if (!partnerId && ctx.mode === "create") return null;

    let unitsUom: number | null | undefined; // undefined = not yet resolved
    const lineCmds: unknown[] = [];
    for (const ln of local.lines) {
      const vals: Record<string, unknown> = {
        name: ln.description || "Line",
        product_uom_qty: ln.quantity,
        price_unit: ln.unitPrice,
        discount: ln.discount,
      };
      const productId = await ctx.odooIdFor("product", ln.productId);
      if (productId) {
        vals.product_id = productId;
      } else {
        if (unitsUom === undefined) unitsUom = await unitsUomId(ctx.client);
        if (unitsUom) vals.product_uom = unitsUom;
      }
      lineCmds.push([0, 0, vals]);
    }
    // On update, clear Odoo's existing lines first, then recreate them — an
    // idempotent full replace (aywa is the source of truth for line content).
    const orderLine = ctx.mode === "update" ? [[5, 0, 0], ...lineCmds] : lineCmds;

    const payload: Record<string, unknown> = {
      client_order_ref: local.number,
      state: STATE_BY_STATUS[local.status] ?? "draft",
      note: local.notes || false,
      date_order: odooDateTime(local.orderDate),
      order_line: orderLine,
    };
    if (partnerId) payload.partner_id = partnerId;
    return payload;
  },
};
