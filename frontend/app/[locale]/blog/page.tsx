export const revalidate = 3600;

import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { PublicPagination } from "@/components/public-pagination";
import { listPosts } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return {
    title: t("title"),
    description: t("metaDescription"),
  };
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("blog");

  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const { items: posts = [], total = 0, page_size: pageSize = 10 } = await listPosts(page);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (page > totalPages && total > 0) {
    notFound();
  }

  return (
    <PageShell title={t("title")} description={t("description")} className="article-layout">
      {posts.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="flex flex-col gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <PublicPagination
        page={page}
        totalPages={totalPages}
        basePath="/blog"
        prevLabel={t("paginationPrev")}
        nextLabel={t("paginationNext")}
        pageLabel={t("paginationPage", { page, totalPages })}
      />
    </PageShell>
  );
}
