import { createTranslator } from "use-intl";
import en from "@/messages/en.json";
import zhCN from "@/messages/zh-CN.json";
import zhTW from "@/messages/zh-TW.json";

type Locale = "zh-CN" | "zh-TW" | "en";
const catalogs = { "zh-CN": zhCN, "zh-TW": zhTW, en };
let locale: Locale = "zh-CN";
const translators = Object.fromEntries(
  Object.entries(catalogs).map(([key, messages]) => [
    key,
    createTranslator({ locale: key, messages, namespace: "admin.ui" }),
  ]),
);

/** For non-React helpers and lazily evaluated option labels. Updated by AdminLocaleProvider. */
export function setAdminMessageLocale(next: Locale) {
  locale = next;
}
export function adminText(key: keyof typeof en.admin.ui, values?: Record<string, string | number | Date>) {
  return translators[locale](key, values);
}

const errorTranslators = Object.fromEntries(
  Object.entries(catalogs).map(([key, messages]) => [
    key,
    createTranslator({ locale: key, messages, namespace: "admin.errors" }),
  ]),
);
export function adminErrorText(key: keyof typeof en.admin.errors) {
  return errorTranslators[locale](key);
}

// Only use this for application notices, never for user content or article text.
const noticeKeys = new Map<string, keyof typeof en.admin.ui>();
const errorKeys = new Map<string, keyof typeof en.admin.errors>();
const noticePatterns: { key: keyof typeof en.admin.ui; pattern: RegExp; fields: string[] }[] = [];
function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
for (const catalog of Object.values(catalogs)) {
  for (const [key, value] of Object.entries(catalog.admin.ui)) {
    if (!value.includes("{p")) {
      noticeKeys.set(value, key as keyof typeof en.admin.ui);
    } else {
      const fields: string[] = [];
      let cursor = 0;
      let pattern = "^";
      for (const match of value.matchAll(/\{(p\d+)\}/g)) {
        pattern += `${escapePattern(value.slice(cursor, match.index))}(.*?)`;
        fields.push(match[1]);
        cursor = match.index + match[0].length;
      }
      pattern += `${escapePattern(value.slice(cursor))}$`;
      noticePatterns.push({
        key: key as keyof typeof en.admin.ui,
        pattern: new RegExp(pattern, "s"),
        fields,
      });
    }
  }
  for (const [key, value] of Object.entries(catalog.admin.errors)) {
    errorKeys.set(value, key as keyof typeof en.admin.errors);
  }
}
export function translatedAdminNotice(value: string): string | undefined {
  const key = noticeKeys.get(value);
  if (key) return adminText(key);
  const errorKey = errorKeys.get(value);
  if (errorKey) return adminErrorText(errorKey);
  for (const entry of noticePatterns) {
    const match = value.match(entry.pattern);
    if (match)
      return adminText(entry.key, Object.fromEntries(entry.fields.map((field, i) => [field, match[i + 1]])));
  }
  return undefined;
}
export function localizeAdminNotice(value: string): string {
  return translatedAdminNotice(value) ?? value;
}
