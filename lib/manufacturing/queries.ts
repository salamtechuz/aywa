import "server-only";

import { db } from "@/lib/db";

// ---------- Bills of materials ----------

export async function listBoms(workspaceId: string) {
  return db.bom.findMany({
    where: { workspaceId },
    include: {
      product: { select: { id: true, sku: true, name: true, unit: true } },
      components: {
        select: { productId: true, quantity: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { reference: "asc" },
  });
}

/** Lightweight list for pickers: which products have an active BOM. */
export async function listBomsForPicker(workspaceId: string) {
  return db.bom.findMany({
    where: { workspaceId, active: true },
    select: { id: true, reference: true, productId: true, quantity: true },
    orderBy: { reference: "asc" },
  });
}

export async function getBom(workspaceId: string, id: string) {
  return db.bom.findFirst({
    where: { id, workspaceId },
    include: {
      product: true,
      components: {
        include: { product: { select: { id: true, sku: true, name: true, unit: true } } },
        orderBy: { position: "asc" },
      },
    },
  });
}

export async function nextBomReference(workspaceId: string) {
  const last = await db.bom.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { reference: true },
  });
  const lastNum = last?.reference?.replace(/\D/g, "");
  const next = lastNum ? parseInt(lastNum, 10) + 1 : 1;
  return `BOM-${String(next).padStart(4, "0")}`;
}

// ---------- Manufacturing orders ----------

/**
 * Orders for the board + detail drawer. Includes the produced product and the
 * full BOM component tree so callers can compute the scaled build plan and
 * component availability.
 */
export async function listManufacturingOrders(workspaceId: string) {
  return db.manufacturingOrder.findMany({
    where: { workspaceId },
    include: {
      product: { select: { id: true, sku: true, name: true, unit: true } },
      bom: {
        select: {
          id: true,
          reference: true,
          quantity: true,
          components: {
            include: { product: { select: { id: true, sku: true, name: true, unit: true } } },
            orderBy: { position: "asc" },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
  });
}

export async function getManufacturingOrder(workspaceId: string, id: string) {
  return db.manufacturingOrder.findFirst({
    where: { id, workspaceId },
    include: {
      product: { select: { id: true, sku: true, name: true, unit: true } },
      bom: {
        select: {
          id: true,
          reference: true,
          quantity: true,
          components: {
            include: { product: { select: { id: true, sku: true, name: true, unit: true } } },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
}

export async function nextManufacturingOrderNumber(workspaceId: string) {
  const last = await db.manufacturingOrder.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const lastNum = last?.number?.replace(/\D/g, "");
  const next = lastNum ? parseInt(lastNum, 10) + 1 : 1;
  return `MO-${String(next).padStart(4, "0")}`;
}

export async function getManufacturingStats(workspaceId: string) {
  const [draft, confirmed, inProgress, done, bomCount] = await Promise.all([
    db.manufacturingOrder.count({ where: { workspaceId, status: "DRAFT" } }),
    db.manufacturingOrder.count({ where: { workspaceId, status: "CONFIRMED" } }),
    db.manufacturingOrder.count({ where: { workspaceId, status: "IN_PROGRESS" } }),
    db.manufacturingOrder.count({ where: { workspaceId, status: "DONE" } }),
    db.bom.count({ where: { workspaceId, active: true } }),
  ]);
  return {
    draftCount: draft,
    confirmedCount: confirmed,
    inProgressCount: inProgress,
    doneCount: done,
    openCount: draft + confirmed + inProgress,
    bomCount,
  };
}
