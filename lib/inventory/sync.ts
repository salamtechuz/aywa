import "server-only";

import { db } from "@/lib/db";
import {
  recordSourceMovementOnce,
  reverseSourceMovements,
} from "@/lib/inventory/stock";

/**
 * "Stock-affecting" statuses commit the order's line items as gone from
 * inventory. The first time an order enters one of these statuses we write
 * OUT movements (idempotent); when it leaves them we reverse those movements.
 */
const STOCK_AFFECTING_SALES = new Set(["DELIVERED", "INVOICED"]);

/**
 * Call after a Sales Order's status changes. Idempotent — safe to call
 * multiple times with the same (oldStatus, newStatus) pair. Pass `null` for
 * oldStatus on creation.
 */
export async function syncStockForSalesOrder(
  workspaceId: string,
  orderId: string,
  oldStatus: string | null,
  newStatus: string,
  ownerName?: string,
) {
  const wasStockAffecting =
    oldStatus !== null && STOCK_AFFECTING_SALES.has(oldStatus);
  const isStockAffecting = STOCK_AFFECTING_SALES.has(newStatus);

  if (!wasStockAffecting && isStockAffecting) {
    await commitSalesOrderStock(workspaceId, orderId, ownerName);
  } else if (wasStockAffecting && !isStockAffecting) {
    await reverseSourceMovements(workspaceId, "SALES_ORDER", orderId, ownerName);
  }
}

async function commitSalesOrderStock(
  workspaceId: string,
  orderId: string,
  ownerName?: string,
) {
  const lines = await db.salesOrderLine.findMany({
    where: { orderId, order: { workspaceId } },
    select: { id: true, productId: true, quantity: true, description: true },
  });
  for (const line of lines) {
    if (!line.productId) continue; // free-text line with no product link
    if (line.quantity <= 0) continue;
    await recordSourceMovementOnce({
      workspaceId,
      productId: line.productId,
      type: "OUT",
      quantity: -line.quantity,
      reason: `Sales order line: ${line.description}`,
      sourceType: "SALES_ORDER",
      sourceId: orderId,
      ownerName,
    });
  }
}

const STOCK_AFFECTING_PURCHASE = new Set(["RECEIVED", "BILLED"]);

/**
 * Same shape as Sales but for Purchase Orders — RECEIVED writes IN movements
 * for every line.
 */
export async function syncStockForPurchaseOrder(
  workspaceId: string,
  orderId: string,
  oldStatus: string | null,
  newStatus: string,
  ownerName?: string,
) {
  const wasStockAffecting =
    oldStatus !== null && STOCK_AFFECTING_PURCHASE.has(oldStatus);
  const isStockAffecting = STOCK_AFFECTING_PURCHASE.has(newStatus);

  if (!wasStockAffecting && isStockAffecting) {
    await commitPurchaseOrderStock(workspaceId, orderId, ownerName);
  } else if (wasStockAffecting && !isStockAffecting) {
    await reverseSourceMovements(workspaceId, "PURCHASE_ORDER", orderId, ownerName);
  }
}

async function commitPurchaseOrderStock(
  workspaceId: string,
  orderId: string,
  ownerName?: string,
) {
  const lines = await db.purchaseOrderLine.findMany({
    where: { orderId, order: { workspaceId } },
    select: { id: true, productId: true, quantity: true, description: true },
  });
  for (const line of lines) {
    if (!line.productId) continue;
    if (line.quantity <= 0) continue;
    await recordSourceMovementOnce({
      workspaceId,
      productId: line.productId,
      type: "IN",
      quantity: line.quantity,
      reason: `Purchase order line: ${line.description}`,
      sourceType: "PURCHASE_ORDER",
      sourceId: orderId,
      ownerName,
    });
  }
}
