"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Boxes, ChevronDown, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Odoo-style module menu-bar: three dropdowns (Products / Reporting /
// Configuration), each a data-driven list of links. `placeholder` items still
// route — to a polished ComingSoon page — and show a muted "soon" pill.
// `groupLabelKey`/`groupStartIndex` insert a section heading inside a dropdown
// (Configuration's "Warehouse Management" group, mirroring Odoo).
type Item = { labelKey: string; href: string; placeholder?: boolean };
type Section = {
  triggerKey: string;
  icon: typeof Boxes;
  items: Item[];
  groupLabelKey?: string;
  groupStartIndex?: number;
};

const SECTIONS: Section[] = [
  {
    triggerKey: "menu.products",
    icon: Boxes,
    items: [
      { labelKey: "menu.products", href: "/inventory" },
      { labelKey: "menu.productVariants", href: "/inventory/variants", placeholder: true },
      { labelKey: "menu.packages", href: "/inventory/packages", placeholder: true },
    ],
  },
  {
    triggerKey: "menu.reporting",
    icon: BarChart3,
    items: [
      { labelKey: "menu.stock", href: "/inventory/stock" },
      { labelKey: "menu.reportLocations", href: "/inventory/reporting-locations", placeholder: true },
      { labelKey: "menu.movesHistory", href: "/inventory/moves" },
      { labelKey: "menu.movesAnalysis", href: "/inventory/moves-analysis", placeholder: true },
      { labelKey: "menu.performance", href: "/inventory/performance", placeholder: true },
    ],
  },
  {
    triggerKey: "menu.configuration",
    icon: Settings2,
    groupLabelKey: "menu.warehouseManagement",
    groupStartIndex: 2,
    items: [
      { labelKey: "menu.settings", href: "/inventory/settings", placeholder: true },
      { labelKey: "menu.unitsOfMeasure", href: "/inventory/units" },
      { labelKey: "menu.warehouses", href: "/inventory/warehouses" },
      { labelKey: "menu.operationTypes", href: "/inventory/operation-types" },
      { labelKey: "menu.configLocations", href: "/inventory/locations" },
      { labelKey: "menu.routes", href: "/inventory/routes", placeholder: true },
      { labelKey: "menu.rules", href: "/inventory/rules", placeholder: true },
      { labelKey: "menu.storageCategories", href: "/inventory/storage-categories" },
      { labelKey: "menu.putawayRules", href: "/inventory/putaway-rules", placeholder: true },
    ],
  },
];

// Root (/inventory) only matches exactly so the Products trigger doesn't light
// on every nested route; sub-pages match themselves and their descendants.
function isItemActive(href: string, pathname: string) {
  if (href === "/inventory") return pathname === "/inventory";
  return pathname === href || pathname.startsWith(href + "/");
}

export function InventoryMenubar() {
  const t = useTranslations("inventory");
  const pathname = usePathname();

  return (
    <div className="px-4 md:px-6 border-b">
      <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-thin">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = section.items.some((it) => isItemActive(it.href, pathname));
          return (
            <DropdownMenu key={section.triggerKey}>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap outline-none transition-colors",
                      active
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(section.triggerKey)}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                }
              />
              <DropdownMenuContent align="start" className="w-auto min-w-56">
                {section.items.map((it, i) => {
                  const itemActive = isItemActive(it.href, pathname);
                  return (
                    <Fragment key={it.href}>
                      {section.groupLabelKey && i === section.groupStartIndex && (
                        <>
                          <DropdownMenuSeparator />
                          <div className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {t(section.groupLabelKey)}
                          </div>
                        </>
                      )}
                      <DropdownMenuItem
                        render={<Link href={it.href} />}
                        className={cn(itemActive && "bg-accent text-accent-foreground")}
                      >
                        <span>{t(it.labelKey)}</span>
                        {it.placeholder && (
                          <span className="ml-auto pl-6 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {t("menu.soon")}
                          </span>
                        )}
                      </DropdownMenuItem>
                    </Fragment>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </nav>
    </div>
  );
}
