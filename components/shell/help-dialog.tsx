"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModKey } from "@/components/patterns/shortcut";

// navKey (reused from the `nav` namespace) + the second key of the "G then X"
// jump shortcut. Mirrors ROUTES in keyboard-shortcuts.tsx.
const NAV_SHORTCUTS: { navKey: string; key: string }[] = [
  { navKey: "dashboard", key: "D" },
  { navKey: "inbox", key: "N" },
  { navKey: "calendar", key: "A" },
  { navKey: "crm", key: "C" },
  { navKey: "salesModule", key: "S" },
  { navKey: "subscriptions", key: "U" },
  { navKey: "inventory", key: "I" },
  { navKey: "purchase", key: "P" },
  { navKey: "reports", key: "R" },
  { navKey: "settings", key: "K" },
];

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function HelpDialog() {
  const t = useTranslations("help");
  const tt = useTranslations("topbar");
  const tn = useTranslations("nav");
  const [open, setOpen] = useState(false);

  // Press "?" anywhere (outside inputs) to open help.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "?") return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button variant="ghost" size="icon" className="hidden md:inline-flex">
                  <HelpCircle className="h-5 w-5" />
                  <span className="sr-only">{tt("helpAndDocs")}</span>
                </Button>
              }
            />
          }
        />
        <TooltipContent>{tt("helpAndDocs")}</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("generalTitle")}
            </h3>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span>{t("search")}</span>
                <span className="flex shrink-0 gap-1">
                  <Kbd><ModKey /></Kbd>
                  <Kbd>K</Kbd>
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>{t("openHelp")}</span>
                <Kbd>?</Kbd>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("navigateTitle")}
            </h3>
            <p className="mb-2.5 text-xs text-muted-foreground">{t("navigateHint")}</p>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {NAV_SHORTCUTS.map((s) => (
                <li key={s.navKey} className="flex items-center justify-between gap-3">
                  <span className="truncate">{tn(s.navKey)}</span>
                  <span className="flex shrink-0 gap-1">
                    <Kbd>G</Kbd>
                    <Kbd>{s.key}</Kbd>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-sm font-medium">{t("tipTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("tip")}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
