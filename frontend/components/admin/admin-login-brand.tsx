"use client";

import { useEffect, useState } from "react";
import { PenLineIcon } from "lucide-react";

import { fetchPublic } from "@/lib/api";
import { DEFAULT_SITE_THEME, type SitePublicTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";

type AdminLoginBrandProps = {
  subtitle?: string;
  className?: string;
};

export function AdminLoginBrand({ subtitle = "管理后台", className }: AdminLoginBrandProps) {
  const [brand, setBrand] = useState<Pick<SitePublicTheme, "site_name" | "site_tagline" | "site_logo_url">>({
    site_name: DEFAULT_SITE_THEME.site_name,
    site_tagline: DEFAULT_SITE_THEME.site_tagline,
    site_logo_url: DEFAULT_SITE_THEME.site_logo_url,
  });

  useEffect(() => {
    fetchPublic<SitePublicTheme>("/public/site-theme")
      .then((data) => {
        setBrand({
          site_name: data.site_name || DEFAULT_SITE_THEME.site_name,
          site_tagline: data.site_tagline ?? DEFAULT_SITE_THEME.site_tagline,
          site_logo_url: data.site_logo_url ?? null,
        });
      })
      .catch(() => {});
  }, []);

  const secondaryLine = brand.site_tagline.trim() || subtitle;

  return (
    <div className={cn("mb-8 flex items-center gap-2.5", className)}>
      {brand.site_logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.site_logo_url}
          alt=""
          className="admin-login-brand-mark size-9 shrink-0 rounded-[2px] border border-border/70 bg-card/90 object-contain p-1 backdrop-blur-sm"
        />
      ) : (
        <span className="admin-login-brand-mark flex size-9 items-center justify-center rounded-[2px] border border-border/70 bg-card/90 backdrop-blur-sm">
          <PenLineIcon className="size-4 text-primary" />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-base font-semibold tracking-tight">{brand.site_name}</span>
        <span className="text-xs text-muted-foreground">{secondaryLine}</span>
      </div>
    </div>
  );
}
