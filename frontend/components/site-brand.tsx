"use client";

import NextLink from "next/link";

import { Link as LocaleLink } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SiteBrandProps = {
  siteName: string;
  siteTagline?: string | null;
  siteLogoUrl?: string | null;
  className?: string;
  titleClassName?: string;
  taglineClassName?: string;
  showTagline?: boolean;
  /** 后台顶栏：链到 dashboard */
  admin?: boolean;
};

export function SiteBrand({
  siteName,
  siteTagline,
  siteLogoUrl,
  className,
  titleClassName,
  taglineClassName,
  showTagline = true,
  admin = false,
}: SiteBrandProps) {
  const tagline = siteTagline?.trim();
  const LinkComponent = admin ? NextLink : LocaleLink;
  const href = admin ? "/admin/dashboard" : "/";

  return (
    <LinkComponent href={href} className={cn("group flex min-w-0 items-center gap-2.5", className)}>
      {siteLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={siteLogoUrl}
          alt=""
          className="h-8 max-h-8 w-auto max-w-[2.75rem] shrink-0 rounded-sm object-contain"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            admin
              ? "truncate font-serif text-lg font-semibold tracking-tight"
              : "truncate font-serif text-xl font-semibold tracking-wide text-foreground transition-colors group-hover:text-primary",
            titleClassName,
          )}
        >
          {siteName}
        </span>
        {showTagline && tagline ? (
          <span
            className={cn(
              admin
                ? "truncate text-xs text-muted-foreground"
                : "hidden truncate text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:block",
              taglineClassName,
            )}
          >
            {tagline}
          </span>
        ) : null}
      </div>
    </LinkComponent>
  );
}
