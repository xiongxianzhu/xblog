export const revalidate = 3600;

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { listPosts } from "@/lib/api";

export const metadata = {
  title: "博客",
  description: "全部已发布文章",
};

export default async function BlogPage() {
  const posts = await listPosts(1, 20);

  return (
    <PageShell title="博客" description="记录思考、项目与日常。">
      {posts.length === 0 ? (
        <EmptyState title="还没有文章" description="发布第一篇文章后，它们会出现在这里。" />
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
