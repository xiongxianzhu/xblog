export const revalidate = 3600;

import { ExternalLinkIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { PageViewTracker } from "@/components/page-view-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listLinks } from "@/lib/api";

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
          {links.map((link) => (
            <Card key={link.id} className="site-glass-panel group transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="transition-colors group-hover:text-primary">
                    {link.name}
                  </a>
                  <ExternalLinkIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="truncate text-sm text-muted-foreground">{link.url}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
