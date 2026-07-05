"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE_MAX_AGE, LOCALE_COOKIE_NAME, locales, type AppLocale } from "@/i18n/routing";

export async function setAppLocale(locale: AppLocale) {
  if (!locales.includes(locale)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}
