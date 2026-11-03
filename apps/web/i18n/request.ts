import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { type AppLocale, defaultLocale, locales, SITE_LOCALE_COOKIE_NAME } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const cookieLocale = (await cookies()).get(SITE_LOCALE_COOKIE_NAME)?.value;
  const locale =
    requested && locales.includes(requested as AppLocale)
      ? requested
      : cookieLocale && locales.includes(cookieLocale as AppLocale)
        ? cookieLocale
        : defaultLocale;
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
