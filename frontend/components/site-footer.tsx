"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Separator } from "@/components/ui/separator";

type SiteFooterProps = {
  siteName: string;
  siteIcpNumber?: string | null;
};

export function SiteFooter({ siteName, siteIcpNumber }: SiteFooterProps) {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const icpNumber = siteIcpNumber?.trim() || null;

  return (
    <footer className="site-glass-bar border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif text-lg font-semibold">{siteName}</p>
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
        <div className="flex flex-col gap-1 text-center text-xs text-muted-foreground sm:text-left">
          <p>{t("copyright", { year: new Date().getFullYear(), siteName })}</p>
          {icpNumber ? (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 transition-colors hover:text-primary sm:justify-start"
            >
              <img
                src="/beian-ghs.png"
                alt=""
                width={16}
                height={16}
                className="size-4 shrink-0"
                aria-hidden
              />
              {icpNumber}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
