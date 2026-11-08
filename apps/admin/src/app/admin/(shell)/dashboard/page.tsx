import { Alert } from "antd";
import { EyeIcon, FileTextIcon, PlusIcon } from "lucide-react";
import useSWR from "swr";
import { useLocale } from "use-intl";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanel } from "@/components/admin/admin-panel";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPostStats, listAdminPosts, listPageViewStats } from "@/lib/api";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { formatDate } from "@/lib/utils";
export default function AdminDashboardPage() {
  const txt = useAdminMessages();
  const locale = useLocale();
  const {
    data: postStats,
    error: statsError,
    isLoading: statsLoading,
    mutate: retryStats,
  } = useSWR("admin-post-stats", getAdminPostStats);
  const {
    data: recentData,
    error: recentError,
    isLoading: recentLoading,
    mutate: retryRecent,
  } = useSWR("admin-dashboard-recent-posts", () => listAdminPosts(1, 5));
  const {
    data: pageviews,
    error: viewsError,
    isLoading: viewsLoading,
    mutate: retryViews,
  } = useSWR("admin-pageviews", listPageViewStats);
  const recentPosts = recentData?.items ?? [];
  const totalViews = (pageviews ?? []).reduce((sum, row) => sum + row.count, 0);
  const statsPending = statsLoading || viewsLoading;
  const statsFailed = statsError || viewsError;
  return (
    <div className="admin-dashboard">
      <AdminPageHeader
        title={txt("m0023")}
        description={txt("m0024")}
        actions={
          <Button asChild>
            <Link href="/admin/posts/new">
              <PlusIcon data-icon="inline-start" />
              {txt("m0025")}
            </Link>
          </Button>
        }
      />

      {statsFailed ? (
        <Alert
          type="error"
          title={txt("m0026")}
          description={txt("m0027")}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void retryStats();
                void retryViews();
              }}
            >
              {txt("m0028")}
            </Button>
          }
        />
      ) : (
        <div className="admin-dashboard-stats grid sm:grid-cols-3">
          {statsPending ? (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{txt("m0029")}</CardTitle>
                  <FileTextIcon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="tabular-nums text-3xl font-semibold">{postStats?.total ?? 0}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {txt("articleCounts", {
                      published: postStats?.published ?? 0,
                      draft: postStats?.draft ?? 0,
                    })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{txt("m0032")}</CardTitle>
                  <EyeIcon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="tabular-nums text-3xl font-semibold">{totalViews}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{txt("m0033")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{txt("m0034")}</CardTitle>
                  <EyeIcon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="tabular-nums text-3xl font-semibold">{(pageviews ?? []).length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{txt("m0035")}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-4 font-serif text-lg font-semibold">{txt("m0036")}</h2>
        {recentLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : recentError ? (
          <Alert
            type="error"
            title={txt("m0037")}
            action={
              <Button variant="outline" size="sm" onClick={() => void retryRecent()}>
                {txt("m0028")}
              </Button>
            }
          />
        ) : recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{txt("m0038")}</p>
        ) : (
          <AdminPanel>
            <ul className="divide-y divide-border">
              {recentPosts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={post.title}>
                      {post.title}
                    </p>
                    {post.updated_at ? (
                      <p className="text-xs text-muted-foreground">{formatDate(post.updated_at, locale)}</p>
                    ) : null}
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/posts/${post.id}/edit`}>{txt("m0039")}</Link>
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
