"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";
import { removeBlob, saveBlob } from "@/lib/attachments/storage";
import type { EntityType } from "@/lib/attachments/queries";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — same default as Vercel Blob hobby tier limits.
const ALLOWED_TYPES = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const ALLOWED_ENTITY_TYPES: ReadonlySet<EntityType> = new Set<EntityType>([
  "DEAL",
  "CONTACT",
  "ORDER",
]);

const REVALIDATE_PATHS: Record<EntityType, string[]> = {
  DEAL: ["/crm"],
  CONTACT: ["/crm", "/crm/customers"],
  ORDER: ["/sales"],
};

export async function uploadAttachment(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const entityTypeRaw = String(formData.get("entityType") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  const file = formData.get("file");

  if (!ALLOWED_ENTITY_TYPES.has(entityTypeRaw as EntityType)) {
    return { ok: false as const, error: "Invalid entity type" };
  }
  if (!entityId) {
    return { ok: false as const, error: "Missing entity id" };
  }
  if (!(file instanceof File)) {
    return { ok: false as const, error: "No file provided" };
  }
  if (file.size === 0) {
    return { ok: false as const, error: "Empty file" };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return {
      ok: false as const,
      error: `File too large (max ${(MAX_SIZE_BYTES / 1024 / 1024) | 0} MB)`,
    };
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return { ok: false as const, error: `Unsupported file type: ${file.type}` };
  }

  const entityType = entityTypeRaw as EntityType;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();

  const bytes = Buffer.from(await file.arrayBuffer());
  const { storageKey } = await saveBlob(bytes, file.name);

  const created = await db.attachment.create({
    data: {
      workspaceId: ws.id,
      entityType,
      entityId,
      filename: file.name,
      storageKey,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploadedBy: user?.email ?? user?.name ?? null,
    },
  });

  for (const p of REVALIDATE_PATHS[entityType]) revalidatePath(p);
  return { ok: true as const, id: created.id };
}

export async function deleteAttachment(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const row = await db.attachment.findFirst({
    where: { id, workspaceId: ws.id },
  });
  if (!row) {
    return { ok: false as const, error: "Not found" };
  }
  await db.attachment.delete({ where: { id } });
  await removeBlob(row.storageKey);
  for (const p of REVALIDATE_PATHS[row.entityType as EntityType] ?? []) {
    revalidatePath(p);
  }
  return { ok: true as const };
}
