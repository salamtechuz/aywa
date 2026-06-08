// Pure constants and helpers — safe to import from BOTH client and server.
// No `next/headers` or other server-only deps allowed here.

export const LOCALES = ["en", "ru", "uz"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_LABELS: Record<Locale, { native: string; flag: string }> = {
  en: { native: "English", flag: "🇬🇧" },
  ru: { native: "Русский", flag: "🇷🇺" },
  uz: { native: "O'zbekcha", flag: "🇺🇿" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
