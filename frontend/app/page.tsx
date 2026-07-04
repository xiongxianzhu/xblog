export const revalidate = 3600;

import Link from "next/link";
import { ArrowRightIcon, PenLineIcon, RssIcon, SearchIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { listPosts } from "@/lib/api";

export default async function HomePage() {
  const posts = await listPosts(1, 5);

  return (
    <div className="page-enter">
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="flex max-w-3xl flex-col gap-6">
            <p className="text-xs uppercase tracking-[0.35em] text-primary">Personal Journal</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              以 Markdown 书写，
              <br />
              <span className="text-primary">以网页留存。</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              自托管的个人博客：FastAPI 驱动内容，Next.js 呈现阅读体验，支持 ISR、搜索与 Giscus 评论。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/blog">
                  进入博客
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/search">
                  <SearchIcon data-icon="inline-start" />
                  搜索
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-3xl font-semibold">最新文章</h2>
            <p className="text-sm text-muted-foreground">最近发布的内容</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/blog">
              查看全部
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        {posts.length === 0 ? (
          <EmptyState title="尚无文章" description="登录后台，写下你的第一篇文章。" />
        ) : (
          <div className="flex flex-col gap-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border/70 bg-card/40">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <Link href="/admin" className="group flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-5 transition-colors hover:border-primary/30">
            <PenLineIcon className="size-5 text-primary" />
            <p className="font-medium">写作后台</p>
            <p className="text-sm text-muted-foreground">Markdown 编辑与发布</p>
          </Link>
          <Link href="/rss.xml" className="group flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-5 transition-colors hover:border-primary/30">
            <RssIcon className="size-5 text-primary" />
            <p className="font-medium">RSS 订阅</p>
            <p className="text-sm text-muted-foreground">跟进博客更新</p>
          </Link>
          <Link href="/about" className="group flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-5 transition-colors hover:border-primary/30">
            <span className="font-serif text-lg text-primary">关于</span>
            <p className="font-medium">认识作者</p>
            <p className="text-sm text-muted-foreground">项目与自我介绍</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
