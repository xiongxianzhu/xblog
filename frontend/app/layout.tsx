import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import { getLocale, getTranslations } from "next-intl/server";

import { getPublicSiteTheme } from "@/lib/site-theme";

import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale, siteTheme] = await Promise.all([getTranslations("meta"), getLocale(), getPublicSiteTheme()]);

  const siteName = siteTheme.site_name;
  const description = siteTheme.site_tagline || t("siteDescription");
  const openGraphLocale = locale === "zh-TW" ? "zh_TW" : locale === "en" ? "en_US" : "zh_CN";

  return {
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description,
    openGraph: {
      type: "website",
      locale: openGraphLocale,
      siteName,
      description,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoSerif.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-clip" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
