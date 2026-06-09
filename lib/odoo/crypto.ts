import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM encryption for the Odoo API key at rest. The key is derived from
// AUTH_SECRET (always set in every environment), so no new env var is required.
// Encrypted values carry an "encv1:" tag so decryptSecret() can transparently
// pass through legacy plaintext values written before encryption was added.

const PREFIX = "encv1:";

function keyBytes(): Buffer {
  const secret = process.env.AUTH_SECRET || "dev-insecure-secret";
  return createHash("sha256").update(`odoo:${secret}`).digest(); // 32 bytes
}

export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value; // legacy plaintext
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return value; // corrupt / wrong key — return as-is (auth will fail and log)
  }
}
