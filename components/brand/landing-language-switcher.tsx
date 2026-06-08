"use client";

import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/app/locale-actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";

/**
 * Standalone language picker for the public landing header (the in-app one
 * lives inside the user menu). Lets first-time, unauthenticated visitors pick
 * en/ru/uz before signing in. Writes the NEXT_LOCALE cookie via setLocale.
 */
export function LandingLanguageSwitcher() {
  const current = useLocale() as Locale;
  const router = useRouter();
  const [, startTransition] = useTransition();

  const onChange = (next: string) => {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5" aria-label="Language">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{LOCALE_LABELS[current].native}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={onChange}>
          {LOCALES.map((loc) => (
            <DropdownMenuRadioItem key={loc} value={loc} className="gap-2">
              <span className="text-base leading-none">{LOCALE_LABELS[loc].flag}</span>
              <span>{LOCALE_LABELS[loc].native}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
