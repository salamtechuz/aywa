"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { ALL_NAV_ITEMS } from "@/lib/navigation";

function titleize(segment: string) {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const tNav = useTranslations("nav");
  const tCrumb = useTranslations("breadcrumbs");

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const match = ALL_NAV_ITEMS.find((item) => item.href === href);
    return { href, label: match ? tNav(match.labelKey) : titleize(seg) };
  });

  return (
    <nav
      aria-label={tCrumb("home")}
      className="flex items-center gap-1 text-xs text-muted-foreground px-6 h-9 border-b bg-background/60"
    >
      <Link
        href="/dashboard"
        className="hover:text-foreground transition-colors flex items-center"
        aria-label={tCrumb("home")}
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {last ? (
              <span className={cn("font-medium text-foreground")}>{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-foreground transition-colors">
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
