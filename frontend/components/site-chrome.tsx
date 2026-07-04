"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteThemeShell } from "@/components/site/site-theme-shell";
import type { SitePublicTheme } from "@/lib/themes";

type SiteChromeProps = {
  children: React.ReactNode;
  siteTheme: SitePublicTheme;
};

export function SiteChrome({ children, siteTheme }: SiteChromeProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <SiteThemeShell theme={siteTheme}>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </SiteThemeShell>
  );
}
