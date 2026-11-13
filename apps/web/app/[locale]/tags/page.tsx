import { pageSeo } from "@/lib/seo";
export const revalidate = 3600;

import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { Link } from "@/i18n/navigation";
import { listTags } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tags" });
  return { ...(await pageSeo("/tags", locale)), title: t("title"), description: t("cloudDescription") };
}

export default async function TagsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tags");
  let tags: Awaited<ReturnType<typeof listTags>>;
  try {
    tags = await listTags();
  } catch {
    return (
      <PageShell title={t("title")} description={t("cloudDescription")}>
        <EmptyState title={t("loadErrorTitle")} description={t("loadErrorDescription")} />
      </PageShell>
    );
  }
  const maxCount = Math.max(1, ...tags.map((tag) => tag.post_count));

  return (
    <PageShell title={t("title")} description={t("cloudDescription")}>
      {tags.length === 0 ? (
        <EmptyState title={t("cloudEmptyTitle")} description={t("cloudEmptyDescription")} />
      ) : (
        <nav aria-label={t("title")} className="site-tag-cloud">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${encodeURIComponent(tag.slug)}`}
              className="site-tag-cloud-link"
              style={{ fontSize: `${1 + 0.75 * Math.sqrt(tag.post_count / maxCount)}rem` }}
              aria-label={`${tag.name} · ${t("postCount", { count: tag.post_count })}`}
            >
              <span className="site-tag-cloud-name">{tag.name}</span>
              <span className="site-tag-cloud-count" aria-hidden="true">
                {tag.post_count}
              </span>
            </Link>
          ))}
        </nav>
      )}
    </PageShell>
  );
}
