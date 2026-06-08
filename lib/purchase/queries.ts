import "server-only";

import { db } from "@/lib/db";

export async function listVendors(workspaceId: string, opts?: { activeOnly?: boolean }) {
  return db.vendor.findMany({
    where: {
      workspaceId,
      ...(opts?.activeOnly ? { active: true } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function listVendorsWithCounts(workspaceId: string) {
  return db.vendor.findMany({
    where: { workspaceId },
    include: { _count: { select: { purchaseOrders: true } } },
    orderBy: { name: "asc" },
  });
}

export async function listPurchaseOrders(workspaceId: string) {
  return db.purchaseOrder.findMany({
    where: { workspaceId },
    include: { vendor: true },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
  });
}

export async function listPurchaseOrderLines(workspaceId: string, orderId: string) {
  return db.purchaseOrderLine.findMany({
    where: { orderId, order: { workspaceId } },
    include: { product: true },
    orderBy: { position: "asc" },
  });
}

export async function nextPurchaseOrderNumber(workspaceId: string) {
  const last = await db.purchaseOrder.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const lastNum = last?.number?.replace(/\D/g, "");
  const next = lastNum ? parseInt(lastNum, 10) + 1 : 1;
  return `PO-${String(next).padStart(4, "0")}`;
}
