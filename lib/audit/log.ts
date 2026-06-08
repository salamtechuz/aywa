import "server-only";

import { db } from "@/lib/db";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "SEND"
  | "OTHER";

export type AuditEntityType =
  | "DEAL"
  | "CUSTOMER"
  | "ORDER"
  | "PRODUCT"
  | "VENDOR"
  | "PO"
  | "ACTIVITY"
  | "MOVEMENT"
  | "ACCOUNT"
  | "JOURNAL_ENTRY"
  | "MANUFACTURING_ORDER"
  | "BOM"
  | "VEHICLE"
  | "WAREHOUSE"
  | "LOCATION"
  | "OPERATION_TYPE"
  | "STORAGE_CATEGORY"
  | "UNIT_OF_MEASURE"
  | "OTHER";

export type AuditInput = {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  summary: string;
  metadata?: unknown;
};

/**
 * Best-effort: writes an AuditLog row. Never throws — if logging itself
 * fails we don't want to take down the user action that triggered it. Use
 * inside server actions after the mutation has succeeded.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const ws = await getActiveWorkspace();
    const user = await getCurrentUser();
    await db.auditLog.create({
      data: {
        workspaceId: ws.id,
        userEmail: user?.email ?? null,
        userName: user?.name ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (err) {
    console.warn("[audit] log failed:", err);
  }
}

export async function listAuditLog(workspaceId: string, limit = 100) {
  return db.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
