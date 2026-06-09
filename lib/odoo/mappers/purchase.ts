import "server-only";

import { db } from "@/lib/db";
import type { EntityMapper } from "../types";

// aywa PurchaseOrder -> Odoo purchase.order. OUTBOUND ONLY (pull: false), the
// buying-side mirror of the sales-order mapper. The vendor (partner_id) and
// each line's product (product_id) are resolved via OdooLink, pushing those
// dependencies first if needed. The aywa PO number is stamped on `origin`
// (Source Document), which doubles as the dedup key.
//
// purchase.order.line requires a product, so free-text (product-less) lines are
// skipped — POs in practice are always product lines.

type PoLineLocal = {
  productId: string | null;
  description: string;
  quantity: number;
  unitCost: number;
};

type PoLocal = {
  id: string;
  workspaceId: string;
  number: string;
  vendorId: string | null;
  status: string;
  orderDate: Date;
  expectedDate: Date | null;
  lines: PoLineLocal[];
};

// aywa status -> Odoo purchase.order.state (stored selection, ORM-writable).
const STATE_BY_STATUS: Record<string, string> = {
  DRAFT: "draft",
  RFQ_SENT: "sent",
  APPROVED: "purchase",
  RECEIVED: "purchase",
  BILLED: "purchase",
  CANCELLED: "cancel",
};

// Odoo stores datetimes as naive UTC "YYYY-MM-DD HH:MM:SS".
function odooDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

const WITH_LINES = { lines: { orderBy: { position: "asc" as const } } };

export const purchaseOrderMapper: EntityMapper<PoLocal> = {
  entityType: "purchase_order",
  odooModel: "purchase.order",
  label: "Purchase orders",
  pull: false,
  odooFields: ["id", "name", "origin", "state", "write_date"],

  async aywaGet(workspaceId, localId) {
    return db.purchaseOrder.findFirst({
      where: { id: localId, workspaceId },
      include: WITH_LINES,
    });
  },

  async aywaList(workspaceId) {
    return db.purchaseOrder.findMany({
      where: { workspaceId },
      include: WITH_LINES,
      orderBy: { updatedAt: "asc" },
      take: 500,
    });
  },

  async matchOdoo(client, local) {
    const hits = await client.searchRead(
      "purchase.order",
      [["origin", "=", local.number]],
      ["id"],
      { limit: 1 },
    );
    const id = hits[0]?.id;
    return typeof id === "number" ? id : null;
  },

  async buildOutbound(ctx, local) {
    const partnerId = await ctx.odooIdFor("vendor", local.vendorId);
    // purchase.order can't be created without a vendor — skip until resolvable.
    if (!partnerId && ctx.mode === "create") return null;

    const datePlanned = odooDateTime(local.expectedDate ?? local.orderDate);
    const lineCmds: unknown[] = [];
    for (const ln of local.lines) {
      const productId = await ctx.odooIdFor("product", ln.productId);
      if (!productId) continue; // purchase.order.line requires a product
      lineCmds.push([
        0,
        0,
        {
          product_id: productId,
          name: ln.description || "Line",
          product_qty: ln.quantity,
          price_unit: ln.unitCost,
          date_planned: datePlanned,
        },
      ]);
    }
    const orderLine = ctx.mode === "update" ? [[5, 0, 0], ...lineCmds] : lineCmds;

    const payload: Record<string, unknown> = {
      origin: local.number,
      state: STATE_BY_STATUS[local.status] ?? "draft",
      date_order: odooDateTime(local.orderDate),
      order_line: orderLine,
    };
    if (partnerId) payload.partner_id = partnerId;
    return payload;
  },
};
