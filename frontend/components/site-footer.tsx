"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const footerNavItems = [
  { href: "/blog", labelKey: "blog" },
  { href: "/about", labelKey: "about" },
  { href: "/projects", labelKey: "projects" },
  { href: "/links", labelKey: "links" },
  { href: "/search", labelKey: "search" },
] as const;

type SiteFooterProps = {
  siteName: string;
  siteIcpNumber?: string | null;
};

export function SiteFooter({ siteName, siteIcpNumber }: SiteFooterProps) {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const icpNumber = siteIcpNumber?.trim() || null;

  return (
    <footer className="site-footer">
      <div className="article-layout mx-auto w-full px-4 py-12 sm:px-6 lg:py-16">
        <div className="site-footer-panel">
          <div className="site-footer-topline" aria-hidden />

          <div className="site-footer-main">
            <div className="site-footer-brand-block">
              <p className="site-footer-kicker">Colophon</p>
              <p className="site-footer-brand">{siteName}</p>
              <p className="site-footer-copy">{t("copyright", { year: new Date().getFullYear(), siteName })}</p>
            </div>

            <div className="site-footer-groups">
              <nav className="site-footer-nav" aria-label={tNav("menu")}>
                <p className="site-footer-heading">Navigate</p>
                <div className="site-footer-link-grid">
                  {footerNavItems.map((item) => (
                    <Link key={item.href} href={item.href} className="site-footer-link">
                      {tNav(item.labelKey)}
                    </Link>
                  ))}
                </div>
              </nav>

              <nav className="site-footer-nav" aria-label="Feeds">
                <p className="site-footer-heading">Feeds</p>
                <div className="site-footer-link-grid">
                  <Link href="/rss.xml" className="site-footer-link">
                    {t("rss")}
                  </Link>
                  <Link href="/sitemap.xml" className="site-footer-link">
                    {t("sitemap")}
                  </Link>
                </div>
              </nav>
            </div>
          </div>

          <div className="site-footer-bottom">
            <p className="site-footer-mark">Published with care.</p>
            {icpNumber ? (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer-icp"
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
      </div>
    </footer>
  );
}
