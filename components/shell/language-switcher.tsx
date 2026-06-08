"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/app/locale-actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";

export function LanguageRadioGroup() {
  const current = useLocale() as Locale;
  const t = useTranslations("userMenu");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const onChange = (next: string) => {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground inline-flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5" /> {t("language")}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup value={current} onValueChange={onChange}>
        {LOCALES.map((loc) => (
          <DropdownMenuRadioItem key={loc} value={loc} className="gap-2">
            <span className="text-base leading-none">{LOCALE_LABELS[loc].flag}</span>
            <span>{LOCALE_LABELS[loc].native}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
