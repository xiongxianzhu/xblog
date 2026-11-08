import { PenLineIcon } from "lucide-react";
import useSWR from "swr";
import { adminText } from "@/lib/admin-messages";
import { getPublicSiteThemeClient } from "@/lib/api";
import { DEFAULT_SITE_THEME } from "@/lib/themes";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

type AdminLoginBrandProps = {
  subtitle?: string;
  className?: string;
  centered?: boolean;
};
export function AdminLoginBrand({
  subtitle = adminText("m0339"),
  className,
  centered = false,
}: AdminLoginBrandProps) {
  useAdminMessages();
  const markSize = centered ? "size-16 rounded-full" : "size-9 rounded-sm";
  const { data, isLoading } = useSWR("public-site-theme", getPublicSiteThemeClient);
  if (!data && isLoading) {
    return (
      <div aria-busy="true" className={cn("mb-8 flex h-10 items-center gap-2.5", className)}>
        <span className={cn(markSize, "bg-muted")} />
        <span className="h-4 w-24 rounded-sm bg-muted" />
      </div>
    );
  }
  const brand = data ?? DEFAULT_SITE_THEME;
  const secondaryLine = data ? data.site_tagline?.trim() : subtitle;
  return (
    <div className={cn("mb-8 flex items-center gap-2.5", className)}>
      {brand.site_logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.site_logo_url}
          alt=""
          className={cn(
            "admin-login-brand-mark shrink-0 border border-border bg-card",
            markSize,
            centered ? "object-cover" : "object-contain p-1",
          )}
        />
      ) : (
        <span
          className={cn(
            "admin-login-brand-mark flex items-center justify-center border border-border bg-card",
            markSize,
          )}
        >
          <PenLineIcon className="size-4 text-primary" />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("truncate font-semibold tracking-tight", centered ? "text-xl" : "text-base")}>
          {brand.site_name}
        </span>
        {secondaryLine && <span className="text-xs text-muted-foreground">{secondaryLine}</span>}
      </div>
    </div>
  );
}
