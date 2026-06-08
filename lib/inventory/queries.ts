import "server-only";

import { db } from "@/lib/db";

export async function listProducts(workspaceId: string, opts?: { activeOnly?: boolean }) {
  return db.product.findMany({
    where: {
      workspaceId,
      ...(opts?.activeOnly ? { active: true } : {}),
    },
    orderBy: { name: "asc" },
  });
}
