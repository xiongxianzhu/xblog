"use server";

import { cookies } from "next/headers";

import {
  ADMIN_LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE,
  SITE_LOCALE_COOKIE_NAME,
  locales,
  type AppLocale,
} from "@/i18n/routing";

export async function setAdminLocale(locale: AppLocale) {
  if (!locales.includes(locale)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

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
