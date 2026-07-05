export const revalidate = 3600;

import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { listPostsByTag } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "tags" });

  return { title: t("metaTitle", { slug }) };
}

export default async function TagPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tags");

  let posts;
  try {
    posts = await listPostsByTag(slug);
  } catch {
    notFound();
  }

  return (
    <PageShell title={`#${slug}`} description={t("description")}>
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
