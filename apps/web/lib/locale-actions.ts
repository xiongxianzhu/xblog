"use server";

import { cookies } from "next/headers";

import { type AppLocale, LOCALE_COOKIE_MAX_AGE, locales, SITE_LOCALE_COOKIE_NAME } from "@/i18n/routing";

export async function setSiteLocale(locale: AppLocale) {
  if (!locales.includes(locale)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(SITE_LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}
