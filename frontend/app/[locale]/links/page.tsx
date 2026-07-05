export const revalidate = 3600;

import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { PageViewTracker } from "@/components/page-view-tracker";
import { Card, CardContent } from "@/components/ui/card";
import { listLinks } from "@/lib/api";
import { resolvePublicAssetUrl } from "@/lib/public-asset-url";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "links" });

  return {
    title: t("title"),
    description: t("metaDescription"),
  };
}

export default async function LinksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("links");

  const links = await listLinks();

  return (
    <PageShell title={t("title")} description={t("description")}>
      <PageViewTracker path="/links" />
      {links.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((link) => {
            const logoUrl = resolvePublicAssetUrl(link.logo_url);
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <Card className="site-glass-panel h-full transition-colors group-hover:border-primary/30">
                  <CardContent className="flex items-start gap-4 p-5">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="size-12 shrink-0 object-contain" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-serif text-lg font-semibold transition-colors group-hover:text-primary">
                        {link.name}
                      </h2>
                      {link.description?.trim() ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{link.description}</p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
