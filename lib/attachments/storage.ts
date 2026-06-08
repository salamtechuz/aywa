import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Storage adapter. Switches between two backends based on env:
 *
 *  - BLOB_READ_WRITE_TOKEN set → Vercel Blob (production)
 *  - otherwise                → local public/uploads/ (development)
 *
 * The local mode keeps `public/uploads/` gitignored so dev uploads never
 * end up in the repo. The Blob mode returns absolute URLs and survives
 * cold starts / horizontal scaling.
 *
 * Consumers store the returned `storageKey` in the DB; `publicUrlFor()`
 * (see storage-public.ts) resolves it back to a downloadable URL.
 */

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_SUB = "uploads";

export type SavedBlob = {
  storageKey: string;
  publicUrl: string;
};

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveBlob(
  bytes: Buffer,
  originalName: string,
): Promise<SavedBlob> {
  const ext = sanitizeExt(path.extname(originalName));
  const key = `${UPLOADS_SUB}/${randomUUID()}${ext}`;

  if (useBlob()) {
    // Dynamic import: keep the bundle small in pure-local dev where the
    // token is unset and @vercel/blob would only add noise.
    const { put } = await import("@vercel/blob");
    const result = await put(key, bytes, {
      access: "public",
      contentType: undefined,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    // Use the full URL as the storage key so publicUrlFor() can return it
    // verbatim — no extra DB column needed.
    return { storageKey: result.url, publicUrl: result.url };
  }

  const fullPath = path.join(PUBLIC_DIR, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);
  return { storageKey: key, publicUrl: `/${key}` };
}

export async function removeBlob(storageKey: string): Promise<void> {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    if (!useBlob()) return; // Don't try to delete a URL we don't own.
    const { del } = await import("@vercel/blob");
    try {
      await del(storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch {
      // Missing/already-deleted blob is fine — the DB row is the source of truth.
    }
    return;
  }

  if (!storageKey.startsWith(`${UPLOADS_SUB}/`)) return;
  const fullPath = path.join(PUBLIC_DIR, storageKey);
  try {
    await unlink(fullPath);
  } catch {
    // Missing file is fine.
  }
}

export function publicUrlFor(storageKey: string): string {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }
  return `/${storageKey}`;
}

function sanitizeExt(ext: string): string {
  if (!ext) return "";
  const cleaned = ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
  if (cleaned.length > 10) return "";
  return cleaned.startsWith(".") ? cleaned : "";
}
