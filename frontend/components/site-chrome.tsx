"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { BackToTopButton } from "@/components/back-to-top-button";
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
      <SiteHeader
        siteName={siteTheme.site_name}
        siteTagline={siteTheme.site_tagline}
        siteLogoUrl={siteTheme.site_logo_url}
      />
      <main className="min-w-0 flex-1">{children}</main>
      <SiteFooter siteName={siteTheme.site_name} siteIcpNumber={siteTheme.site_icp_number} />
      <BackToTopButton />
    </SiteThemeShell>
  );
}
