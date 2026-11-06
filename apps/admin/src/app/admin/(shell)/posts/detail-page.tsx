import { Alert, Button, Spin, Tag } from "antd";
import { ExternalLink, FileText, Pencil, Pin } from "lucide-react";
import { lazy, Suspense } from "react";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminPost } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import { formatDateTime } from "@/lib/utils";

const MarkdownContent = lazy(() =>
  import("@/components/markdown-content").then((module) => ({ default: module.MarkdownContent })),
);

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { resolvedMode } = useAdminTheme();
  const postId = Number(id);
  const valid = Number.isSafeInteger(postId) && postId > 0;
  const {
    data: post,
    error,
    isLoading,
    mutate,
  } = useSWR(valid ? ["admin-post", postId] : null, () => getAdminPost(postId));
  const cover = resolveAdminAssetPreviewUrl(post?.cover_url);
  return (
    <div>
      <AdminPageHeader
        title="文章详情"
        description="预览文章正文与发布信息。"
        actions={
          <>
            <Button onClick={() => router.push("/admin/posts")}>返回文章列表</Button>
            {post ? (
              <Button
                type="primary"
                icon={<Pencil size={16} />}
                onClick={() => router.push(`/admin/posts/${post.id}/edit`)}
              >
                编辑文章
              </Button>
            ) : null}
          </>
        }
      />
      {!valid ? (
        <Alert type="error" title="文章编号无效" />
      ) : error ? (
        <Alert
          type="error"
          title="无法加载文章"
          description={error instanceof Error ? error.message : "请稍后重试"}
          action={<Button onClick={() => void mutate()}>重试</Button>}
        />
      ) : isLoading || !post ? (
        <Spin />
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Tag color={post.status === "published" ? "success" : "default"}>
                {post.status === "published" ? "已发布" : "草稿"}
              </Tag>
              {post.is_pinned ? (
                <Tag>
                  <span className="inline-flex items-center gap-1">
                    <Pin size={12} />
                    已置顶
                  </span>
                </Tag>
              ) : null}
              <span className="text-xs text-muted-foreground">
                文章 #{post.id}
                <CopyFieldButton value={post.id} label="文章 ID" />
              </span>
            </div>
            <h2 className="m-0 break-words text-2xl font-semibold leading-snug sm:text-3xl">{post.title}</h2>
            {post.excerpt ? (
              <p className="mb-0 mt-4 whitespace-pre-wrap break-words leading-7 text-muted-foreground">
                {post.excerpt}
              </p>
            ) : null}
            {post.tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Tag key={tag.id}>{tag.name}</Tag>
                ))}
              </div>
            ) : null}
          </Card>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={18} />
                  正文预览
                </CardTitle>
              </CardHeader>
              {cover ? (
                <img src={cover} alt="文章封面" className="mb-6 max-h-96 w-full rounded object-contain" />
              ) : null}
              <Suspense
                fallback={
                  <div className="py-8 text-center">
                    <Spin />
                  </div>
                }
              >
                <MarkdownContent content={post.content_md} colorMode={resolvedMode} emptyHint="暂无正文" />
              </Suspense>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>发布信息</CardTitle>
              </CardHeader>
              <dl className="m-0 flex flex-col gap-5">
                <div>
                  <dt className="text-sm text-muted-foreground">文章路径（slug）</dt>
                  <dd className="m-0 mt-2 break-all font-mono text-sm">
                    {post.slug}
                    <CopyFieldButton value={post.slug} label="文章路径" />
                  </dd>
                </div>
                {[
                  ["创建时间", post.created_at],
                  ["更新时间", post.updated_at],
                  ["发布时间", post.published_at],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="m-0 mt-2 text-sm tabular-nums">{value ? formatDateTime(value) : "-"}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 border-t pt-5">
                {post.status === "published" ? (
                  <Button
                    href={`/blog/${encodeURIComponent(post.slug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    icon={<ExternalLink size={16} />}
                  >
                    在公开站查看
                  </Button>
                ) : (
                  <p className="m-0 text-sm leading-6 text-muted-foreground">
                    此文章为草稿，仅在管理端预览，公开站不可访问。
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
