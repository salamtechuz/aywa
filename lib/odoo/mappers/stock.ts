import "server-only";

import { db } from "@/lib/db";
import { computeOnHand } from "@/lib/inventory/stock";

import { hashPayload } from "../hash";
import type { EntityMapper, OdooClient, SelfOutboundCtx } from "../types";

// aywa stock level -> Odoo inventory. OUTBOUND ONLY, and self-managed via
// pushOutbound because setting Odoo stock is an ACTION, not a record write:
// aywa stock is a global signed ledger (computeOnHand), while Odoo tracks
// quantity per product.product (variant) per stock.location, set through an
// inventory adjustment (write inventory_quantity under the inventory_mode
// context, then action_apply_inventory).
//
// The entity is keyed by productId. We sync the on-hand to the warehouse's main
// stock location (the first internal location as a fallback). The OdooLink for
// ("stock", productId) stores the Odoo variant id + a hash of the quantity, so
// an unchanged quantity is a no-op (echo-guard).
//
// NOTE: this is the riskiest mapper and is unvalidated against a live Odoo. The
// Odoo inventory-adjustment API is version-sensitive; everything runs inside
// the engine's try/catch, so a failure here only logs — it never affects aywa.

type ProductRef = { id: string; workspaceId: string };

// Resolve the destination internal location: a warehouse's main stock location
// (lot_stock_id), falling back to the first internal location.
async function resolveStockLocation(client: OdooClient): Promise<number | null> {
  try {
    const wh = await client.searchRead("stock.warehouse", [], ["lot_stock_id"], { limit: 1 });
    const lot = wh[0]?.lot_stock_id; // many2one read as [id, name]
    if (Array.isArray(lot) && typeof lot[0] === "number") return lot[0];
  } catch {
    // fall through
  }
  try {
    const locs = await client.searchRead("stock.location", [["usage", "=", "internal"]], ["id"], {
      limit: 1,
      order: "id",
    });
    const id = locs[0]?.id;
    if (typeof id === "number") return id;
  } catch {
    // give up
  }
  return null;
}

// Set the on-hand quantity for (variant, location) via an inventory adjustment.
async function applyInventory(
  client: OdooClient,
  variantId: number,
  locationId: number,
  qty: number,
): Promise<number> {
  const ctx = { context: { inventory_mode: true } };
  const existing = await client.searchRead(
    "stock.quant",
    [
      ["product_id", "=", variantId],
      ["location_id", "=", locationId],
    ],
    ["id"],
    { limit: 1 },
  );
  const existingId = existing[0]?.id;
  let quantId: number;
  if (typeof existingId === "number") {
    quantId = existingId;
    await client.callKw("stock.quant", "write", [[quantId], { inventory_quantity: qty }], ctx);
  } else {
    const created = await client.callKw(
      "stock.quant",
      "create",
      [{ product_id: variantId, location_id: locationId, inventory_quantity: qty }],
      ctx,
    );
    quantId = typeof created === "number" ? created : variantId;
  }
  await client.callKw("stock.quant", "action_apply_inventory", [[quantId]], ctx);
  return quantId;
}

export const stockMapper: EntityMapper<ProductRef> = {
  entityType: "stock",
  odooModel: "stock.quant",
  label: "Stock levels",
  pull: false,
  odooFields: ["id", "write_date"],

  async aywaGet(workspaceId, localId) {
    return db.product.findFirst({
      where: { id: localId, workspaceId },
      select: { id: true, workspaceId: true },
    });
  },

  async aywaList(workspaceId) {
    return db.product.findMany({
      where: { workspaceId, active: true },
      select: { id: true, workspaceId: true },
      take: 1000,
    });
  },

  async pushOutbound(ctx: SelfOutboundCtx, local) {
    const onHand = await computeOnHand(local.workspaceId, local.id);
    const hash = hashPayload({ qty: onHand });
    const link = await ctx.getLink();
    if (link && link.contentHash === hash) return; // quantity unchanged — no-op

    // The product must exist in Odoo first; push it if it isn't linked yet.
    const templateId = await ctx.odooIdFor("product", local.id);
    if (!templateId) return;

    const variants = await ctx.client.searchRead(
      "product.product",
      [["product_tmpl_id", "=", templateId]],
      ["id"],
      { limit: 1 },
    );
    const variantId = variants[0]?.id;
    if (typeof variantId !== "number") return;

    const locationId = await resolveStockLocation(ctx.client);
    if (!locationId) return;

    const quantId = await applyInventory(ctx.client, variantId, locationId, onHand);
    await ctx.saveLink(quantId, hash);
  },
};
