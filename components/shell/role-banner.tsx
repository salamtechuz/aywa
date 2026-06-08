import { Eye } from "lucide-react";

import { currentRole } from "@/lib/permissions";

/**
 * Server-rendered banner shown only to VIEWER-role users. Tells them why
 * action buttons won't work and offers an ADMIN-contact link. Mounted once
 * in the (app) layout so it shows on every page; hidden for MEMBER+ roles.
 */
export async function RoleBanner() {
  const role = await currentRole();
  if (role !== "VIEWER") return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500/15 text-amber-800 dark:text-amber-200 text-xs border-b border-amber-500/30">
      <Eye className="h-3.5 w-3.5" />
      <span>
        <strong>Read-only mode.</strong> You can browse everything but won&apos;t be
        able to create or edit. Ask a workspace admin to upgrade your role.
      </span>
    </div>
  );
}
