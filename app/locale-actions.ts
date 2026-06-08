"use server";

import { cookies } from "next/headers";

import { LOCALES, LOCALE_COOKIE, isLocale } from "@/i18n/config";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) {
    return { ok: false as const, error: "Unsupported locale" };
  }
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { ok: true as const, locale };
}

export async function getAvailableLocales() {
  return LOCALES;
}
