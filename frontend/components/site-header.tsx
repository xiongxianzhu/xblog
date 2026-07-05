"use client";

import { useState } from "react";
import { MenuIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteBrand } from "@/components/site-brand";
import { SiteSearchForm } from "@/components/site-search-form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/blog", labelKey: "blog" },
  { href: "/about", labelKey: "about" },
  { href: "/projects", labelKey: "projects" },
  { href: "/links", labelKey: "links" },
  { href: "/search", labelKey: "search" },
] as const;

type SiteHeaderProps = {
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

export function SiteHeader({ siteName, siteTagline, siteLogoUrl }: SiteHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-glass-bar sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="size-9 shrink-0 px-0 lg:hidden" aria-label={t("menu")}>
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
                <NavLink
                  href="/admin"
                  label={t("admin")}
                  active={false}
                  onNavigate={() => setMobileOpen(false)}
                  className="mt-2 border border-border/70 px-3 py-2.5 text-sm font-medium"
                />
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
            className="min-w-0 flex-1 lg:flex-none"
          />
        </div>

        <nav className="hidden shrink-0 items-center gap-0.5 text-sm lg:ml-24 lg:flex xl:ml-32">
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
          <Link
            href="/admin"
            className="ml-2 rounded-sm border border-border/70 px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {t("admin")}
          </Link>
        </nav>

        <div className="hidden min-w-6 flex-1 lg:block" aria-hidden />

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <SiteSearchForm compact />
          <LocaleSwitcher compact />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:hidden">
          <Button asChild variant="ghost" size="sm" className="size-9 px-0" aria-label={t("search")}>
            <Link href="/search">
              <SearchIcon className="size-4" />
            </Link>
          </Button>
          <LocaleSwitcher compact />
        </div>
      </div>
    </header>
  );
}
