"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Factory, ListTree } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/manufacturing", key: "tabs.orders", icon: Factory },
  { href: "/manufacturing/boms", key: "tabs.boms", icon: ListTree },
] as const;

export function ManufacturingNav() {
  const t = useTranslations("manufacturing");
  const pathname = usePathname();

  return (
    <div className="px-4 md:px-6 border-b">
      <nav className="flex items-center gap-1 -mb-px">
        {TABS.map((tab) => {
          const active =
            tab.href === "/manufacturing"
              ? pathname === "/manufacturing"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(tab.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
