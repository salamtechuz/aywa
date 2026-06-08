import "server-only";

import { db } from "@/lib/db";

export async function listWarehouses(workspaceId: string) {
  return db.warehouse.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}

/** Warehouses with location/operation-type counts — used for the table badges
 *  and to block deletion of a warehouse that still has dependents. */
export async function listWarehousesWithUsage(workspaceId: string) {
  return db.warehouse.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: { _count: { select: { locations: true, operationTypes: true } } },
  });
}
