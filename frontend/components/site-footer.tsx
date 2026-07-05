"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Separator } from "@/components/ui/separator";

type SiteFooterProps = {
  siteName: string;
};

export function SiteFooter({ siteName }: SiteFooterProps) {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  return (
    <footer className="site-glass-bar border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-lg font-semibold">{siteName}</p>
            <p className="text-sm text-muted-foreground">{t("tagline")}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/blog" className="transition-colors hover:text-primary">
              {tNav("blog")}
            </Link>
            <Link href="/rss.xml" className="transition-colors hover:text-primary">
              {t("rss")}
            </Link>
            <Link href="/sitemap.xml" className="transition-colors hover:text-primary">
              {t("sitemap")}
            </Link>
          </div>
        </div>
        <Separator />
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          {t("copyright", { year: new Date().getFullYear(), siteName })}
        </p>
      </div>
    </footer>
  );
}
