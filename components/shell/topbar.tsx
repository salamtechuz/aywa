"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { Membership } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

import { CommandPaletteTrigger } from "./command-palette";
import { HelpDialog } from "./help-dialog";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import {
  NotificationBell,
  type InboxPreviewItem,
} from "./notification-bell";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

type TopbarProps = {
  memberships: Membership[];
  activeWorkspaceId: string;
  user: { name: string; email: string; image?: string | null };
  inboxPreview: InboxPreviewItem[];
  inboxTotal: number;
  inboxUrgentCount: number;
};

export function Topbar({
  memberships,
  activeWorkspaceId,
  user,
  inboxPreview,
  inboxTotal,
  inboxUrgentCount,
}: TopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tNav = useTranslations("nav");
  const active = memberships.find((m) => m.workspace.id === activeWorkspaceId)!.workspace;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 md:px-6 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <KeyboardShortcuts />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">{tNav("navigation")}</SheetTitle>
          <Sidebar
            mobile
            onNavigate={() => setMobileOpen(false)}
            workspaceName={active.name}
            workspaceSlug={active.slug}
            workspacePlan={active.plan}
          />
        </SheetContent>
      </Sheet>

      <WorkspaceSwitcher memberships={memberships} activeId={activeWorkspaceId} />

      <Separator orientation="vertical" className="h-6 hidden md:block" />

      <div className="flex-1 min-w-0 flex justify-center max-w-md mx-auto">
        <CommandPaletteTrigger />
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell
          preview={inboxPreview}
          total={inboxTotal}
          urgentCount={inboxUrgentCount}
        />
        <HelpDialog />
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </div>
    </header>
  );
}
