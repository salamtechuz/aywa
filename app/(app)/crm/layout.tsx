"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("crm");
  const tabs = [
    { label: t("tabPipeline"), href: "/crm" },
    { label: t("tabCustomers"), href: "/crm/customers" },
  ];

  return (
    <>
      <div className="border-b px-6 pt-3">
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const active =
              tab.href === "/crm"
                ? pathname === "/crm"
                : pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </>
  );
}
