import "server-only";

import { db } from "@/lib/db";

export async function listUnitsOfMeasure(workspaceId: string) {
  return db.unitOfMeasure.findMany({
    where: { workspaceId },
    orderBy: [{ category: "asc" }, { factor: "asc" }, { name: "asc" }],
  });
}
