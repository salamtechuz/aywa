import "server-only";

import { db } from "@/lib/db";

export type EntityType = "DEAL" | "CONTACT" | "ORDER";

export type AttachmentRow = {
  id: string;
  filename: string;
  storageKey: string;
  mimeType: string;
  size: number;
  uploadedBy: string | null;
  createdAt: Date;
};

export async function listAttachments(
  workspaceId: string,
  entityType: EntityType,
  entityId: string,
): Promise<AttachmentRow[]> {
  return db.attachment.findMany({
    where: { workspaceId, entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}
