import { defineRouting } from "next-intl/routing";

export const locales = ["zh-CN", "zh-TW", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "zh-CN";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export const localeLabels: Record<AppLocale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
};

/** next-intl 默认 locale cookie，管理后台等无 locale 前缀路由靠此切换语言 */
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
