import "server-only";

import { db } from "@/lib/db";

export type SalesOrderWithCustomer = Awaited<ReturnType<typeof listSalesOrders>>[number];

export async function listSalesOrders(workspaceId: string) {
  return db.salesOrder.findMany({
    where: { workspaceId },
    select: {
      id: true,
      number: true,
      amount: true,
      currency: true,
      status: true,
      expectedDate: true,
      ownerName: true,
      stripePaidAt: true,
      customer: { select: { name: true, company: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
  });
}

export async function listOrderLines(workspaceId: string, orderId: string) {
  return db.salesOrderLine.findMany({
    where: { orderId, order: { workspaceId } },
    include: { product: true },
    orderBy: { position: "asc" },
  });
}

/**
 * Batched variant of listOrderLines: fetch lines for many orders in ONE query
 * (avoids the per-order N+1). Caller groups the flat list by orderId.
 */
export async function listOrderLinesForOrders(workspaceId: string, orderIds: string[]) {
  if (orderIds.length === 0) return [];
  return db.salesOrderLine.findMany({
    where: { orderId: { in: orderIds }, order: { workspaceId } },
    include: { product: true },
    orderBy: [{ orderId: "asc" }, { position: "asc" }],
  });
}

export async function nextSalesOrderNumber(workspaceId: string) {
  const last = await db.salesOrder.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const lastNum = last?.number?.replace(/\D/g, "");
  const next = lastNum ? parseInt(lastNum, 10) + 1 : 1;
  return `SO-${String(next).padStart(4, "0")}`;
}
