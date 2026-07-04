import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";

import { SiteChrome } from "@/components/site-chrome";
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

export const metadata: Metadata = {
  title: {
    default: "xblog",
    template: "%s · xblog",
  },
  description: "个人博客 · Markdown 写作 · 自托管",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "xblog",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteTheme = await getPublicSiteTheme();

  return (
    <html lang="zh-CN" className={`${notoSans.variable} ${notoSerif.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteChrome siteTheme={siteTheme}>{children}</SiteChrome>
      </body>
    </html>
  );
}
