import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { IntlProvider } from "use-intl";
import { setAdminMessageLocale } from "@/lib/admin-messages";
import en from "@/messages/en.json";
import zhCN from "@/messages/zh-CN.json";
import zhTW from "@/messages/zh-TW.json";
export type AdminLocale = "zh-CN" | "zh-TW" | "en";
const messages = { "zh-CN": zhCN, "zh-TW": zhTW, en };
const Context = createContext<{ locale: AdminLocale; setLocale: (locale: AdminLocale) => void }>({
  locale: "zh-CN",
  setLocale: () => {},
});
export function AdminLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<AdminLocale>(() => {
    const stored = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ADMIN_LOCALE="))
      ?.split("=")[1];
    const initial = stored === "en" || stored === "zh-TW" ? stored : "zh-CN";
    setAdminMessageLocale(initial);
    return initial;
  });
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function setLocale(next: AdminLocale) {
    if (next !== "zh-CN" && next !== "zh-TW" && next !== "en") return;
    // biome-ignore lint/suspicious/noDocumentCookie: A validated non-sensitive preference cookie supports browsers without Cookie Store.
    document.cookie = `ADMIN_LOCALE=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    setAdminMessageLocale(next);
    setState(next);
  }
  return (
    <Context.Provider value={{ locale, setLocale }}>
      <IntlProvider locale={locale} messages={messages[locale]} timeZone="Asia/Shanghai">
        {children}
      </IntlProvider>
    </Context.Provider>
  );
}
export const useAdminLocale = () => useContext(Context);
