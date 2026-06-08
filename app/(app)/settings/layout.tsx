"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("settings");
  const tabs = [
    { label: t("tabGeneral"), href: "/settings/general" },
    { label: t("tabMembers"), href: "/settings/members" },
    { label: t("tabBilling"), href: "/settings/billing" },
    { label: t("tabAppearance"), href: "/settings/appearance" },
    { label: "Developer", href: "/settings/developer" },
    { label: "Audit log", href: "/settings/audit" },
  ];

  return (
    <>
      <div className="px-6 py-6 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="border-b px-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
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
      <div className="p-6 max-w-4xl">{children}</div>
    </>
  );
}
