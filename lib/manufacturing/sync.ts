import "server-only";

import { db } from "@/lib/db";
import {
  recordSourceMovementOnce,
  reverseSourceMovements,
} from "@/lib/inventory/stock";
import { STOCK_COMMIT_STATUS } from "@/lib/manufacturing/stages";

/**
 * A manufacturing order commits stock the first time it reaches DONE: every
 * BOM component is consumed (OUT) and the produced good is created (IN). When
 * the order leaves DONE the movements are reversed. Idempotent — safe to call
 * repeatedly with the same (oldStatus, newStatus). Mirrors the Sales/Purchase
 * stock sync so the inventory ledger stays the single source of truth.
 */
export async function syncStockForManufacturingOrder(
  workspaceId: string,
  orderId: string,
  oldStatus: string | null,
  newStatus: string,
  ownerName?: string,
) {
  const wasDone = oldStatus === STOCK_COMMIT_STATUS;
  const isDone = newStatus === STOCK_COMMIT_STATUS;

  if (!wasDone && isDone) {
    await commitProduction(workspaceId, orderId, ownerName);
  } else if (wasDone && !isDone) {
    await reverseSourceMovements(workspaceId, "MANUFACTURING_ORDER", orderId, ownerName);
  }
}

async function commitProduction(
  workspaceId: string,
  orderId: string,
  ownerName?: string,
) {
  const order = await db.manufacturingOrder.findFirst({
    where: { id: orderId, workspaceId },
    include: {
      product: { select: { id: true, name: true } },
      bom: {
        select: {
          quantity: true,
          components: { select: { productId: true, quantity: true } },
        },
      },
    },
  });
  if (!order) return;

  // Scale the recipe to the ordered quantity. A BOM yields `bom.quantity`
  // units; an ad-hoc order (no BOM) just produces with no consumption.
  const batch = order.bom && order.bom.quantity > 0 ? order.bom.quantity : 1;
  const factor = order.quantity / batch;

  // Aggregate components by product so duplicate component rows (or a product
  // that appears twice) collapse into one movement — recordSourceMovementOnce
  // dedupes per (sourceType, sourceId, productId).
  const required = new Map<string, number>();
  for (const c of order.bom?.components ?? []) {
    if (c.quantity <= 0) continue;
    required.set(c.productId, (required.get(c.productId) ?? 0) + c.quantity * factor);
  }

  for (const [productId, qty] of required) {
    if (qty <= 0) continue;
    await recordSourceMovementOnce({
      workspaceId,
      productId,
      type: "OUT",
      quantity: -qty,
      reason: `Consumed by ${order.number}`,
      sourceType: "MANUFACTURING_ORDER",
      sourceId: orderId,
      ownerName,
    });
  }

  if (order.quantity > 0) {
    await recordSourceMovementOnce({
      workspaceId,
      productId: order.productId,
      type: "IN",
      quantity: order.quantity,
      reason: `Produced by ${order.number}`,
      sourceType: "MANUFACTURING_ORDER",
      sourceId: orderId,
      ownerName,
    });
  }
}
