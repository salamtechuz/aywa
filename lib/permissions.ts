import "server-only";

import { getWorkspaces } from "@/lib/tenant";

export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type PermissionResult =
  | { allowed: true; role: Role }
  | { allowed: false; reason: string };

/**
 * Checks the current user's role in the active workspace and whether it
 * satisfies the minimum required role.
 *
 * Role hierarchy (higher = more privileged):
 *   OWNER > ADMIN > MEMBER > VIEWER
 *
 * Call this from server actions before any mutation:
 *
 *   const perm = await requireRole("MEMBER");
 *   if (!perm.allowed) return { ok: false, error: perm.reason };
 */
const RANK: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export async function requireRole(minRole: Role): Promise<PermissionResult> {
  const memberships = await getWorkspaces();
  const first = memberships[0];
  if (!first) {
    return { allowed: false, reason: "Not a member of any workspace" };
  }
  const role = first.role;
  if (RANK[role] < RANK[minRole]) {
    return {
      allowed: false,
      reason: `This action requires ${minRole.toLowerCase()} role or above; you are ${role.toLowerCase()}.`,
    };
  }
  return { allowed: true, role };
}

export async function currentRole(): Promise<Role> {
  const memberships = await getWorkspaces();
  return memberships[0]?.role ?? "VIEWER";
}

export async function canEdit(): Promise<boolean> {
  return RANK[await currentRole()] >= RANK.MEMBER;
}

export async function canAdmin(): Promise<boolean> {
  return RANK[await currentRole()] >= RANK.ADMIN;
}

/**
 * Shorthand used at the top of every mutating server action. Returns
 * `null` if the caller is allowed to write, otherwise returns a uniform
 * error envelope that the action can `return` directly.
 *
 * Usage:
 *   const denied = await assertCanWrite();
 *   if (denied) return denied;
 */
export async function assertCanWrite(): Promise<
  { ok: false; error: string } | null
> {
  const perm = await requireRole("MEMBER");
  if (perm.allowed) return null;
  return { ok: false, error: perm.reason };
}

export async function assertCanAdmin(): Promise<
  { ok: false; error: string } | null
> {
  const perm = await requireRole("ADMIN");
  if (perm.allowed) return null;
  return { ok: false, error: perm.reason };
}
