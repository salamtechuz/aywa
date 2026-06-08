import "server-only";

import { db } from "@/lib/db";

export async function listStorageCategories(workspaceId: string) {
  return db.storageCategory.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}

/** Storage categories with location counts — for table badges and to block
 *  deletion of a category still referenced by locations. */
export async function listStorageCategoriesWithUsage(workspaceId: string) {
  return db.storageCategory.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: { _count: { select: { locations: true } } },
  });
}
