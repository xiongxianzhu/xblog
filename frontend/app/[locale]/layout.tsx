import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SiteChrome } from "@/components/site-chrome";
import { routing, type AppLocale } from "@/i18n/routing";
import { getPublicSiteTheme } from "@/lib/site-theme";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);

  const [messages, siteTheme] = await Promise.all([getMessages(), getPublicSiteTheme()]);

  return (
    <NextIntlClientProvider messages={messages}>
      <SiteChrome siteTheme={siteTheme}>{children}</SiteChrome>
    </NextIntlClientProvider>
  );
}
