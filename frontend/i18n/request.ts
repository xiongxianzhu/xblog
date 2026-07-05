import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { defaultLocale, LOCALE_COOKIE_NAME, locales, type AppLocale } from "./routing";

function isAdminPathname(pathname: string | null): boolean {
  return pathname === "/admin" || (pathname?.startsWith("/admin/") ?? false);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname");
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  let locale = await requestLocale;

  if (isAdminPathname(pathname)) {
    if (cookieLocale && locales.includes(cookieLocale as AppLocale)) {
      locale = cookieLocale;
    } else if (!locale || !locales.includes(locale as AppLocale)) {
      locale = defaultLocale;
    }
  } else if (!locale || !locales.includes(locale as AppLocale)) {
    if (cookieLocale && locales.includes(cookieLocale as AppLocale)) {
      locale = cookieLocale;
    } else {
      locale = defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
