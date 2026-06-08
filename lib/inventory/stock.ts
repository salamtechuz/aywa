import "server-only";

import { db } from "@/lib/db";

export type StockMovementRow = {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reason: string | null;
  sourceType: string;
  sourceId: string | null;
  ownerName: string | null;
  createdAt: Date;
};

/**
 * Returns current on-hand quantity for a product, computed live from the
 * StockMovement ledger. This is the authoritative number — `Product.stockOnHand`
 * is a cached denormalization that callers should treat as a hint.
 */
export async function computeOnHand(
  workspaceId: string,
  productId: string,
): Promise<number> {
  const agg = await db.stockMovement.aggregate({
    where: { workspaceId, productId },
    _sum: { quantity: true },
  });
  return Number(agg._sum.quantity ?? 0);
}

/**
 * Batch version: returns a map of productId → onHand quantity for the given IDs.
 */
export async function computeOnHandMap(
  workspaceId: string,
  productIds: string[],
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.stockMovement.groupBy({
    by: ["productId"],
    where: { workspaceId, productId: { in: productIds } },
    _sum: { quantity: true },
  });
  const map = new Map<string, number>();
  for (const id of productIds) map.set(id, 0);
  for (const r of rows) {
    map.set(r.productId, Number(r._sum.quantity ?? 0));
  }
  return map;
}

export async function listMovementsForProduct(
  workspaceId: string,
  productId: string,
  limit = 50,
): Promise<StockMovementRow[]> {
  return db.stockMovement.findMany({
    where: { workspaceId, productId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export type CreateMovementInput = {
  workspaceId: string;
  productId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "INITIAL" | "TRANSFER";
  quantity: number; // signed; OUT should already be negative when caller passes it
  reason?: string;
  sourceType: "SALES_ORDER" | "PURCHASE_ORDER" | "MANUFACTURING_ORDER" | "MANUAL" | "INITIAL_LOAD";
  sourceId?: string;
  ownerName?: string;
};

/**
 * Writes a single movement and keeps the denormalized `Product.stockOnHand`
 * in sync. Pass already-signed quantities (OUT should be negative).
 */
export async function recordMovement(input: CreateMovementInput) {
  return db.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        workspaceId: input.workspaceId,
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason ?? null,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        ownerName: input.ownerName ?? null,
      },
    });
    // Keep the cached count in sync. Floor to int because the column is Int.
    await tx.product.update({
      where: { id: input.productId },
      data: { stockOnHand: { increment: Math.round(input.quantity) } },
    });
    return movement;
  });
}

/**
 * Idempotent helper for source-driven movements (sales/purchase order lines).
 * If a movement already exists for the given (sourceType, sourceId, productId)
 * pair, do nothing — the caller is replaying a state transition.
 */
export async function recordSourceMovementOnce(
  input: CreateMovementInput & { sourceId: string },
) {
  const existing = await db.stockMovement.findFirst({
    where: {
      workspaceId: input.workspaceId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      productId: input.productId,
    },
  });
  if (existing) return existing;
  return recordMovement(input);
}

/**
 * Reverses every movement linked to a given (sourceType, sourceId) by writing
 * compensating rows. Used when a sales/purchase order is reverted out of a
 * stock-affecting state (e.g. DELIVERED → CONFIRMED).
 */
export async function reverseSourceMovements(
  workspaceId: string,
  sourceType: CreateMovementInput["sourceType"],
  sourceId: string,
  ownerName?: string,
) {
  const movements = await db.stockMovement.findMany({
    where: { workspaceId, sourceType, sourceId },
  });
  for (const m of movements) {
    // Don't reverse already-reversed pairs.
    if (m.reason?.startsWith("Reversal of ")) continue;
    await recordMovement({
      workspaceId,
      productId: m.productId,
      type: "ADJUSTMENT",
      quantity: -m.quantity,
      reason: `Reversal of ${sourceType} ${sourceId}`,
      sourceType: "MANUAL",
      ownerName,
    });
  }
}

export type LowStockProduct = {
  id: string;
  sku: string;
  name: string;
  onHand: number;
  reorderAt: number;
  unit: string;
};

export async function listLowStock(
  workspaceId: string,
): Promise<LowStockProduct[]> {
  const products = await db.product.findMany({
    where: { workspaceId, active: true, reorderAt: { gt: 0 } },
    select: { id: true, sku: true, name: true, reorderAt: true, unit: true },
  });
  if (products.length === 0) return [];
  const onHandMap = await computeOnHandMap(
    workspaceId,
    products.map((p) => p.id),
  );
  return products
    .map((p) => ({
      ...p,
      onHand: onHandMap.get(p.id) ?? 0,
    }))
    .filter((p) => p.onHand <= p.reorderAt)
    .sort((a, b) => a.onHand - a.reorderAt - (b.onHand - b.reorderAt));
}

export async function computeInventoryValue(workspaceId: string): Promise<{
  totalCost: number;
  totalRetail: number;
  productCount: number;
}> {
  const products = await db.product.findMany({
    where: { workspaceId, active: true },
    select: { id: true, cost: true, price: true },
  });
  const onHandMap = await computeOnHandMap(
    workspaceId,
    products.map((p) => p.id),
  );
  let totalCost = 0;
  let totalRetail = 0;
  for (const p of products) {
    const onHand = onHandMap.get(p.id) ?? 0;
    totalCost += onHand * p.cost;
    totalRetail += onHand * p.price;
  }
  return { totalCost, totalRetail, productCount: products.length };
}

/**
 * Combined inventory value + low-stock in ONE product fetch and ONE ledger
 * aggregation. computeInventoryValue + listLowStock each scan the StockMovement
 * ledger separately; pages that need both (e.g. /reports) should use this to
 * halve the work. Numbers are byte-identical to calling the two helpers.
 */
export async function getInventorySummary(workspaceId: string): Promise<{
  value: { totalCost: number; totalRetail: number; productCount: number };
  lowStock: LowStockProduct[];
}> {
  const products = await db.product.findMany({
    where: { workspaceId, active: true },
    select: { id: true, sku: true, name: true, cost: true, price: true, reorderAt: true, unit: true },
  });
  const onHandMap = await computeOnHandMap(
    workspaceId,
    products.map((p) => p.id),
  );
  let totalCost = 0;
  let totalRetail = 0;
  const lowStock: LowStockProduct[] = [];
  for (const p of products) {
    const onHand = onHandMap.get(p.id) ?? 0;
    totalCost += onHand * p.cost;
    totalRetail += onHand * p.price;
    if (p.reorderAt > 0 && onHand <= p.reorderAt) {
      lowStock.push({ id: p.id, sku: p.sku, name: p.name, onHand, reorderAt: p.reorderAt, unit: p.unit });
    }
  }
  lowStock.sort((a, b) => a.onHand - a.reorderAt - (b.onHand - b.reorderAt));
  return { value: { totalCost, totalRetail, productCount: products.length }, lowStock };
}

export type MovementHistoryRow = StockMovementRow & {
  workspaceId: string;
  product: { sku: string; name: string; unit: string };
};

/**
 * Workspace-wide movement history for the Reporting → Moves History report.
 * Paginated + optionally filtered by movement type. Returns the page rows plus
 * the total count (for the pager). Joins the product for display.
 */
export async function listAllMovements(
  workspaceId: string,
  opts?: { type?: string; take?: number; skip?: number },
): Promise<{ rows: MovementHistoryRow[]; total: number }> {
  const where = {
    workspaceId,
    ...(opts?.type ? { type: opts.type } : {}),
  };
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts?.take ?? 100,
      skip: opts?.skip ?? 0,
      include: { product: { select: { sku: true, name: true, unit: true } } },
    }),
    db.stockMovement.count({ where }),
  ]);
  return { rows, total };
}
