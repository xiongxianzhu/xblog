export const revalidate = 3600;

import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { listPostsByTag } from "@/lib/api";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `标签：${slug}` };
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  let posts;
  try {
    posts = await listPostsByTag(slug);
  } catch {
    notFound();
  }

  return (
    <PageShell title={`#${slug}`} description="该标签下的全部文章。">
      {posts.length === 0 ? (
        <EmptyState title="暂无文章" description="该标签下还没有已发布的内容。" />
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
