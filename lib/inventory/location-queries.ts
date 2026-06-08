import "server-only";

import { db } from "@/lib/db";

export async function listLocations(workspaceId: string) {
  return db.location.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: {
      warehouse: { select: { id: true, code: true, name: true } },
      storageCategory: { select: { id: true, name: true } },
    },
  });
}
