import "server-only";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";

/**
 * Token format: `aywa_<scope>_<random32hex>`. The prefix shown in the UI is
 * the first 8 chars including the `aywa_` prefix; the full string is shown
 * exactly once at creation time and then only its bcrypt hash is stored.
 */
export function generateToken(scope: "READ" | "WRITE"): {
  token: string;
  prefix: string;
} {
  const r = randomBytes(24).toString("hex");
  const scopeChar = scope === "WRITE" ? "w" : "r";
  const token = `aywa_${scopeChar}_${r}`;
  return { token, prefix: token.slice(0, 12) };
}

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * Resolves an `Authorization: Bearer ...` header to a workspace + scope.
 * Returns `null` for missing / malformed / unknown / revoked tokens.
 */
export async function authenticateToken(
  authHeader: string | null,
): Promise<{ workspaceId: string; scope: "READ" | "WRITE"; tokenId: string } | null> {
  if (!authHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!match) return null;
  const token = match[1];
  if (!token.startsWith("aywa_")) return null;
  const prefix = token.slice(0, 12);

  // Lookup candidates by prefix (visible field) — handful of rows max per
  // workspace. Bcrypt compare to find the actual one.
  const candidates = await db.apiToken.findMany({
    where: { prefix, revokedAt: null },
  });
  for (const c of candidates) {
    const matches = await bcrypt.compare(token, c.tokenHash);
    if (matches) {
      // Async fire-and-forget — don't block the response on a write.
      void db.apiToken
        .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      return {
        workspaceId: c.workspaceId,
        scope: c.scope as "READ" | "WRITE",
        tokenId: c.id,
      };
    }
  }
  return null;
}
