import "server-only";

import { db } from "@/lib/db";

export async function listOperationTypes(workspaceId: string) {
  return db.operationType.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: { warehouse: { select: { id: true, code: true, name: true } } },
  });
}
