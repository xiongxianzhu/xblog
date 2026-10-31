import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getLocale, getTranslations } from "next-intl/server";

import { getPublicSiteTheme } from "@/lib/site-theme";
import { getSiteIconDescriptor } from "@/lib/public-asset-url";

import "./globals.css";

// Google Fonts 官方可变字体；字体文件及 OFL 许可证随项目分发。
const notoSans = localFont({
  src: "./fonts/NotoSansSC.woff2",
  variable: "--font-noto-sans",
  weight: "400 600",
  style: "normal",
  display: "swap",
});

const notoSerif = localFont({
  src: "./fonts/NotoSerifSC.woff2",
  variable: "--font-noto-serif",
  weight: "500 700",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const geistMono = localFont({
  src: "./fonts/GeistMono.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale, siteTheme] = await Promise.all([getTranslations("meta"), getLocale(), getPublicSiteTheme()]);

  const siteName = siteTheme.site_name;
  const description = siteTheme.site_tagline || t("siteDescription");
  const openGraphLocale = locale === "zh-TW" ? "zh_TW" : locale === "en" ? "en_US" : "zh_CN";
  const siteIcon = getSiteIconDescriptor(siteTheme.site_logo_url);

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
    ...(siteIcon
      ? {
          icons: {
            icon: [siteIcon],
            shortcut: [siteIcon],
            apple: [siteIcon],
          },
        }
      : {}),
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
