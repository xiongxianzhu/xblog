import { defineRouting } from "next-intl/routing";

export const locales = ["zh-CN", "zh-TW", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "zh-CN";

/** 公开站语言偏好（next-intl 中间件与无 locale 前缀访问） */
export const SITE_LOCALE_COOKIE_NAME = "SITE_LOCALE";

/** 管理后台语言偏好（/admin 无 locale 前缀） */
export const ADMIN_LOCALE_COOKIE_NAME = "ADMIN_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeCookie: {
    name: SITE_LOCALE_COOKIE_NAME,
    maxAge: LOCALE_COOKIE_MAX_AGE,
  },
});

export const localeLabels: Record<AppLocale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
};
