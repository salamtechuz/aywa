import { NextResponse, type NextRequest } from "next/server";

import { authenticateToken } from "@/lib/api/tokens";

export type ApiAuth = {
  workspaceId: string;
  scope: "READ" | "WRITE";
  tokenId: string;
};

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Authenticates a request via the Authorization header. Returns the auth
 * context, or a 401 NextResponse if invalid. Use:
 *
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 *   // auth.workspaceId, auth.scope are now safe to use.
 */
export async function requireAuth(
  req: NextRequest,
  needsWrite = false,
): Promise<ApiAuth | NextResponse> {
  const auth = await authenticateToken(req.headers.get("authorization"));
  if (!auth) return jsonError(401, "Missing or invalid Bearer token");
  if (needsWrite && auth.scope !== "WRITE") {
    return jsonError(403, "This token is read-only");
  }
  return auth;
}

export function parsePagination(req: NextRequest): { take: number; skip: number } {
  const url = new URL(req.url);
  const take = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10), 1), 200);
  const skip = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
  return { take, skip };
}
