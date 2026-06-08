"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Building2,
  Loader2,
  Moon,
  Monitor,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Sun,
  Users,
} from "lucide-react";

import { NAV_GROUPS, SETTINGS_ITEM } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { useIsMac } from "@/components/patterns/shortcut";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { searchAll, type SearchResult } from "@/app/(app)/search-actions";

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, startSearch] = useTransition();
  const router = useRouter();
  const { setTheme } = useTheme();
  const t = useTranslations("commandPalette");
  const tNav = useTranslations("nav");
  const tTop = useTranslations("topbar");
  const tCommon = useTranslations("common");
  const isMac = useIsMac();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      startSearch(async () => {
        const r = await searchAll(query);
        setResults(r);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const grouped = {
    deals: results.filter((r): r is Extract<SearchResult, { kind: "deal" }> => r.kind === "deal"),
    customers: results.filter((r): r is Extract<SearchResult, { kind: "customer" }> => r.kind === "customer"),
    orders: results.filter((r): r is Extract<SearchResult, { kind: "order" }> => r.kind === "order"),
    products: results.filter((r): r is Extract<SearchResult, { kind: "product" }> => r.kind === "product"),
  };

  const hasQuery = query.trim().length >= 2;
  const hasResults =
    grouped.deals.length + grouped.customers.length + grouped.orders.length + grouped.products.length > 0;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full max-w-md justify-between gap-3 text-muted-foreground font-normal"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span className="text-sm">{tTop("jumpToAnything")}</span>
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          {isMac ? (
            <>
              <span className="text-xs">⌘</span>K
            </>
          ) : (
            "Ctrl K"
          )}
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("title")}
        description={t("placeholder")}
      >
        <CommandInput
          placeholder={t("placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {hasQuery && !hasResults && !pending && (
            <CommandEmpty>{tCommon("noResults")}</CommandEmpty>
          )}

          {hasQuery && pending && (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("searching")}
            </div>
          )}

          {/* Search results */}
          {grouped.deals.length > 0 && (
            <CommandGroup heading={t("groupDeals")}>
              {grouped.deals.map((r) => (
                <CommandItem
                  key={`d-${r.id}`}
                  value={`deal-${r.id}-${r.title}`}
                  onSelect={run(() => router.push("/crm"))}
                  className="gap-3"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    {r.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                    )}
                  </div>
                  {r.meta && (
                    <span className="text-[11px] text-muted-foreground font-mono">{r.meta}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {grouped.customers.length > 0 && (
            <CommandGroup heading={t("groupCustomers")}>
              {grouped.customers.map((r) => (
                <CommandItem
                  key={`c-${r.id}`}
                  value={`customer-${r.id}-${r.title}`}
                  onSelect={run(() => router.push("/crm/customers"))}
                  className="gap-3"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    {r.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                    )}
                  </div>
                  {r.meta && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                      {r.meta}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {grouped.orders.length > 0 && (
            <CommandGroup heading={t("groupOrders")}>
              {grouped.orders.map((r) => (
                <CommandItem
                  key={`o-${r.id}`}
                  value={`order-${r.id}-${r.title}`}
                  onSelect={run(() => router.push("/sales"))}
                  className="gap-3"
                >
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate font-mono">{r.title}</div>
                    {r.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                    )}
                  </div>
                  {r.meta && (
                    <span className="text-[11px] text-muted-foreground font-mono">{r.meta}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {grouped.products.length > 0 && (
            <CommandGroup heading={t("groupProducts")}>
              {grouped.products.map((r) => (
                <CommandItem
                  key={`p-${r.id}`}
                  value={`product-${r.id}-${r.title}`}
                  onSelect={run(() => router.push("/inventory"))}
                  className="gap-3"
                >
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    {r.subtitle && (
                      <div className="text-xs text-muted-foreground truncate font-mono">
                        {r.subtitle}
                      </div>
                    )}
                  </div>
                  {r.meta && (
                    <span className="text-[11px] text-muted-foreground">{r.meta}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {hasResults && <CommandSeparator />}

          {/* Modules (always visible) */}
          {!hasQuery &&
            NAV_GROUPS.map((group) => {
              const groupLabel = tNav(group.labelKey);
              return (
                <CommandGroup key={group.labelKey} heading={groupLabel}>
                  {group.items.map((item) => {
                    const label = tNav(item.labelKey);
                    return (
                      <CommandItem
                        key={item.href}
                        value={`${groupLabel} ${label} ${item.description ?? ""}`}
                        onSelect={run(() => router.push(item.href))}
                        className="gap-3"
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{label}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                        {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}

          {!hasQuery && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("quickCreate")}>
                {[
                  { label: t("newCustomer"), href: "/crm/customers" },
                  { label: t("newDeal"), href: "/crm" },
                  { label: t("newQuote"), href: "/sales" },
                  { label: t("newProduct"), href: "/inventory" },
                ].map((q) => (
                  <CommandItem
                    key={q.label}
                    onSelect={run(() => router.push(q.href))}
                    className="gap-3"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{q.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading={tNav("settings")}>
                <CommandItem onSelect={run(() => setTheme("light"))} className="gap-3">
                  <Sun className="h-4 w-4 text-muted-foreground" /> {t("useLightTheme")}
                </CommandItem>
                <CommandItem onSelect={run(() => setTheme("dark"))} className="gap-3">
                  <Moon className="h-4 w-4 text-muted-foreground" /> {t("useDarkTheme")}
                </CommandItem>
                <CommandItem onSelect={run(() => setTheme("system"))} className="gap-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" /> {t("useSystemTheme")}
                </CommandItem>
                <CommandItem
                  onSelect={run(() => router.push(SETTINGS_ITEM.href))}
                  className="gap-3"
                >
                  <SETTINGS_ITEM.icon className="h-4 w-4 text-muted-foreground" />
                  {t("openSettings")}
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
