import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  logo: string | null;
  accentColor: string | null;
  defaultCurrency: string;
};

export type Membership = {
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  workspace: Workspace;
};

// Seeded demo workspace ID. Synthetic dev users (id starts with "dev:") and
// unauthenticated server-side calls fall back to this so the existing seed
// data remains visible without requiring a real signup.
const DEMO_WORKSPACE: Workspace = {
  id: "ws_acme",
  name: "Acme Corp",
  slug: "acme",
  plan: "PRO",
  logo: null,
  accentColor: null,
  defaultCurrency: "USD",
};

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

function isDevUser(id: string | undefined | null): boolean {
  return Boolean(id && id.startsWith("dev:"));
}

export async function getWorkspaces(): Promise<Membership[]> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || isDevUser(userId)) {
    return [{ role: "OWNER", workspace: DEMO_WORKSPACE }];
  }

  const memberships = await db.membership.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    // Authenticated real user with no workspace (shouldn't happen post-signup,
    // but covers edge cases like manually-created accounts). Surface the demo
    // workspace so the app doesn't 500.
    return [{ role: "OWNER", workspace: DEMO_WORKSPACE }];
  }

  return memberships.map((m) => ({
    role: m.role as Membership["role"],
    workspace: {
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      plan: m.workspace.plan as Workspace["plan"],
      logo: m.workspace.logo,
      accentColor: m.workspace.accentColor,
      defaultCurrency: m.workspace.defaultCurrency,
    },
  }));
}

export async function getActiveWorkspace(): Promise<Workspace> {
  const memberships = await getWorkspaces();
  return memberships[0]!.workspace;
}
