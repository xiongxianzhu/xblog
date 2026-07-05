export const revalidate = 3600;

import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { listPostsByTag } from "@/lib/api";
import { decodeRouteParam } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, slug: rawSlug } = await params;
  const slug = decodeRouteParam(rawSlug);
  const t = await getTranslations({ locale, namespace: "tags" });

  return { title: t("metaTitle", { slug }) };
}

export default async function TagPage({ params }: Props) {
  const { locale, slug: rawSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tags");
  const tagSlug = decodeRouteParam(rawSlug);

  let posts;
  try {
    posts = await listPostsByTag(tagSlug);
  } catch {
    notFound();
  }

  const tagLabel = posts.flatMap((post) => post.tags).find((tag) => tag.slug === tagSlug)?.name ?? tagSlug;

  return (
    <PageShell title={`#${tagLabel}`} description={t("description")}>
      {posts.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="flex flex-col gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
