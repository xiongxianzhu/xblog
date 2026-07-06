import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  ADMIN_LOCALE_COOKIE_NAME,
  SITE_LOCALE_COOKIE_NAME,
  defaultLocale,
  locales,
  type AppLocale,
} from "./routing";

function isAdminPathname(pathname: string | null): boolean {
  return pathname === "/admin" || (pathname?.startsWith("/admin/") ?? false);
}

function readCookieLocale(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  names: string[],
): AppLocale | null {
  for (const name of names) {
    const value = cookieStore.get(name)?.value;
    if (value && locales.includes(value as AppLocale)) {
      return value as AppLocale;
    }
  }
  return null;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname");
  const cookieStore = await cookies();

  let locale = await requestLocale;

  if (isAdminPathname(pathname)) {
    const adminLocale = readCookieLocale(cookieStore, [ADMIN_LOCALE_COOKIE_NAME]);

    if (adminLocale) {
      locale = adminLocale;
    } else if (!locale || !locales.includes(locale as AppLocale)) {
      locale = defaultLocale;
    }
  } else if (!locale || !locales.includes(locale as AppLocale)) {
    const siteLocale = readCookieLocale(cookieStore, [SITE_LOCALE_COOKIE_NAME]);

    locale = siteLocale ?? defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
