import { redirect } from "next/navigation";

import { AccentLoader } from "@/components/shell/accent-loader";
import { RoleBanner } from "@/components/shell/role-banner";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { loadInbox } from "@/lib/inbox/queries";
import { getCurrentUser, getWorkspaces, getActiveWorkspace } from "@/lib/tenant";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [memberships, active] = await Promise.all([
    getWorkspaces(),
    getActiveWorkspace(),
  ]);

  // Inbox preview for the bell dropdown. The full /inbox page re-fetches
  // its own copy with a longer list.
  const inboxItems = await loadInbox(active.id);
  const inboxPreview = inboxItems.slice(0, 5).map((i) => ({
    id: i.id,
    kind: i.kind,
    title: i.title,
    subtitle: i.subtitle,
    href: i.href,
    dueAt: i.dueAt ? i.dueAt.toISOString() : null,
  }));
  const urgentCount = inboxItems.filter(
    (i) =>
      i.kind === "task-overdue" ||
      i.kind === "task-today" ||
      i.kind === "order-overdue" ||
      i.kind === "deal-closing",
  ).length;

  const accentStyle: React.CSSProperties | undefined = active.accentColor
    ? {
        // Workspace-level accent overrides the localStorage default for every
        // signed-in user. Applies via inline style on the shell wrapper so it
        // wins over any class-based defaults.
        ["--primary" as never]: active.accentColor,
        ["--ring" as never]: active.accentColor,
        ["--sidebar-primary" as never]: active.accentColor,
        ["--sidebar-ring" as never]: active.accentColor,
      }
    : undefined;

  return (
    <div className="min-h-screen flex bg-background" style={accentStyle}>
      <AccentLoader />
      <Sidebar
        workspaceName={active.name}
        workspaceSlug={active.slug}
        workspacePlan={active.plan}
        workspaceLogo={active.logo}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          memberships={memberships}
          activeWorkspaceId={active.id}
          user={{
            name: user.name ?? user.email ?? "User",
            email: user.email ?? "",
            image: user.image,
          }}
          inboxPreview={inboxPreview}
          inboxTotal={inboxItems.length}
          inboxUrgentCount={urgentCount}
        />
        <RoleBanner />
        <Breadcrumbs />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
