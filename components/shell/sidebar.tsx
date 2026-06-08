"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronsLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { NAV_GROUPS, SETTINGS_ITEM } from "@/lib/navigation";
import { publicUrlFor } from "@/lib/attachments/storage-public";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SidebarProps = {
  workspaceName: string;
  workspaceSlug: string;
  workspacePlan: string;
  workspaceLogo?: string | null;
  /** Rendered inside the mobile drawer: always visible + expanded, no collapse. */
  mobile?: boolean;
  /** Called when a nav link is tapped — lets the mobile drawer close itself. */
  onNavigate?: () => void;
};

export function Sidebar({
  workspaceName,
  workspaceSlug,
  workspacePlan,
  workspaceLogo,
  mobile = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // The mobile drawer is never collapsed (the sheet handles width).
  const isCollapsed = !mobile && collapsed;
  const t = useTranslations("nav");

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        mobile
          ? "h-full w-full"
          : cn(
              "hidden md:flex sticky top-0 h-screen shrink-0 transition-[width] duration-200",
              collapsed ? "w-[68px]" : "w-64",
            ),
      )}
    >
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
        {workspaceLogo ? (
          <Image
            src={publicUrlFor(workspaceLogo)}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-contain shrink-0 bg-sidebar-accent"
            unoptimized
          />
        ) : (
          <Logo className="h-8 w-8 shrink-0 text-sidebar-primary" />
        )}
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold leading-tight truncate">
              {workspaceName}
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight truncate">
              {workspaceSlug}.aywa.app · {workspacePlan}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey}>
            {!isCollapsed && (
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
                {t(group.labelKey)}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const label = t(item.labelKey);
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isCollapsed && "justify-center",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger render={link} />
                        <TooltipContent side="right">{label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Link
          href={SETTINGS_ITEM.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isCollapsed && "justify-center",
          )}
        >
          <SETTINGS_ITEM.icon className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>{t(SETTINGS_ITEM.labelKey)}</span>}
        </Link>
        {/* The collapse toggle only makes sense on the persistent desktop rail. */}
        {!mobile && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-muted-foreground hover:text-foreground",
              collapsed ? "px-0" : "justify-start",
            )}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={t("collapse")}
          >
            <ChevronsLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
            {!collapsed && <span className="ml-2 text-xs">{t("collapse")}</span>}
          </Button>
        )}
      </div>
    </aside>
  );
}
