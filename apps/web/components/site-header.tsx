"use client";

import { MenuIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteBrand } from "@/components/site-brand";
import { SiteSearchForm } from "@/components/site-search-form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import type { SiteNavItem } from "@/lib/site-navigation";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  githubLinkEnabled?: boolean;
  githubLinkUrl?: string;
  navItems: SiteNavItem[];
  siteName: string;
  siteTagline?: string | null;
  siteLogoUrl?: string | null;
};

function NavLink({
  href,
  label,
  active,
  onNavigate,
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "rounded-sm transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}

export function SiteHeader({
  siteName,
  siteTagline,
  siteLogoUrl,
  navItems,
  githubLinkEnabled,
  githubLinkUrl,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);
  const githubLink =
    githubLinkEnabled && githubLinkUrl && /^https?:\/\//i.test(githubLinkUrl) ? (
      <Button asChild variant="ghost" size="sm" className="size-9 shrink-0 px-0">
        <a href={githubLinkUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub">
          <svg className="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.45 7.45 0 0 1 8 3.88c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          <span className="sr-only">GitHub</span>
        </a>
      </Button>
    ) : null;

  return (
    <header className="site-glass-bar sticky top-0 z-40 border-b">
      <div className="article-layout mx-auto flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-9 shrink-0 px-0 lg:hidden"
                aria-label={t("menu")}
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100vw-2rem,20rem)] gap-0 p-0">
              <SheetHeader className="border-b border-border/70 px-4 py-4 text-left">
                <SheetTitle className="font-serif text-lg">{siteName}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3" aria-label={t("menu")}>
                {navItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={t(item.labelKey)}
                      active={active}
                      onNavigate={() => setMobileOpen(false)}
                      className="px-3 py-2.5 text-sm font-medium"
                    />
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-border/70 p-4">
                <SiteSearchForm initialQuery="" />
                <div className="mt-4">
                  <LocaleSwitcher />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <SiteBrand
            siteName={siteName}
            siteTagline={siteTagline}
            siteLogoUrl={siteLogoUrl}
            className="min-w-0"
          />
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <nav className="flex items-center gap-0.5 text-sm" aria-label={t("menu")}>
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={t(item.labelKey)}
                  active={active}
                  className="px-3 py-1.5"
                />
              );
            })}
          </nav>

          <div className="ml-2 flex items-center gap-2 border-l border-border/50 pl-3">
            <SiteSearchForm compact />
            <LocaleSwitcher compact />
            {githubLink}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          <Button asChild variant="ghost" size="sm" className="size-9 px-0" aria-label={t("search")}>
            <Link href="/search">
              <SearchIcon className="size-4" />
            </Link>
          </Button>
          <LocaleSwitcher compact />
          {githubLink}
        </div>
      </div>
    </header>
  );
}
