"use client";

import Link from "next/link";
import useSWR from "swr";
import { EyeIcon, FileTextIcon, PenLineIcon, PlusIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanel } from "@/components/admin/admin-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdminPosts, listPageViewStats } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: posts, isLoading: postsLoading } = useSWR("admin-posts", listAdminPosts);
  const { data: pageviews, isLoading: viewsLoading } = useSWR("admin-pageviews", listPageViewStats);

  const publishedCount = (posts ?? []).filter((post) => post.status === "published").length;
  const draftCount = (posts ?? []).filter((post) => post.status === "draft").length;
  const totalViews = (pageviews ?? []).reduce((sum, row) => sum + row.count, 0);
  const recentPosts = [...(posts ?? [])]
    .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
    .slice(0, 5);

  const loading = postsLoading || viewsLoading;

  return (
    <div>
      <AdminPageHeader
        title="仪表盘"
        description="站点内容与健康概览"
        actions={
          <Button asChild>
            <Link href="/admin/posts/new">
              <PlusIcon data-icon="inline-start" />
              新建文章
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">文章总数</CardTitle>
                <FileTextIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-semibold">{(posts ?? []).length}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  已发布 {publishedCount} · 草稿 {draftCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">累计访问</CardTitle>
                <EyeIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-semibold">{totalViews}</p>
                <p className="mt-1 text-xs text-muted-foreground">来自 PageView 统计</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">热门路径</CardTitle>
                <EyeIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-semibold">{(pageviews ?? []).length}</p>
                <p className="mt-1 text-xs text-muted-foreground">已记录的不同页面</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">快捷入口</CardTitle>
                <PenLineIcon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/posts">管理文章</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/logs">查看日志</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-4 font-serif text-lg font-semibold">最近更新</h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有文章，去写一篇吧。</p>
        ) : (
          <AdminPanel>
            <ul className="divide-y divide-border">
              {recentPosts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{post.title}</p>
                    {post.updated_at ? (
                      <p className="text-xs text-muted-foreground">{formatDate(post.updated_at)}</p>
                    ) : null}
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/posts/${post.id}/edit`}>编辑</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </AdminPanel>
        )}
      </section>
    </div>
  );
}
