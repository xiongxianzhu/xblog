import { Alert, Button, Spin, Tag } from "antd";
import { ExternalLink, FileText, Pencil, Pin } from "lucide-react";
import { lazy, Suspense } from "react";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { PostExportButton } from "@/components/admin/post-transfer-actions";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { getAdminPost, getAdminSiteTheme } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import { getPublicPostUrl } from "@/lib/public-site-url";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { formatDateTime } from "@/lib/utils";

const MarkdownContent = lazy(() =>
  import("@/components/markdown-content").then((module) => ({
    default: module.MarkdownContent,
  })),
);
export default function PostDetailPage() {
  const txt = useAdminMessages();
  const { id } = useParams<{
    id: string;
  }>();
  const router = useRouter();
  const { resolvedMode } = useAdminTheme();
  const { data: siteTheme, error: siteThemeError } = useSWR("admin-site-theme", getAdminSiteTheme);
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
        title={txt("m0164")}
        description={txt("m0165")}
        actions={
          <>
            <Button onClick={() => router.push("/admin/posts")}>{txt("m0166")}</Button>
            {post ? <PostExportButton postId={post.id} /> : null}
            {post ? (
              <Button
                type="primary"
                icon={<Pencil size={16} />}
                onClick={() => router.push(`/admin/posts/${post.id}/edit`)}
              >
                {txt("m0167")}
              </Button>
            ) : null}
          </>
        }
      />
      {!valid ? (
        <Alert type="error" title={txt("m0168")} />
      ) : error ? (
        <Alert
          type="error"
          title={txt("m0169")}
          description={getAdminErrorMessage(error)}
          action={<Button onClick={() => void mutate()}>{txt("m0028")}</Button>}
        />
      ) : isLoading || !post ? (
        <Spin />
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Tag color={post.status === "published" ? "success" : "default"}>
                {post.status === "published" ? txt("m0030") : txt("m0170")}
              </Tag>
              {post.is_pinned ? (
                <Tag>
                  <span className="inline-flex items-center gap-1">
                    <Pin size={12} />
                    {txt("m0171")}
                  </span>
                </Tag>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {txt("m0172")}
                {post.id}
                <CopyFieldButton value={post.id} label={txt("m0173")} />
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
                  {txt("m0174")}
                </CardTitle>
              </CardHeader>
              {cover ? (
                <img src={cover} alt={txt("m0175")} className="mb-6 max-h-96 w-full rounded object-contain" />
              ) : null}
              <Suspense
                fallback={
                  <div className="py-8 text-center">
                    <Spin />
                  </div>
                }
              >
                <MarkdownContent
                  content={post.content_md}
                  colorMode={resolvedMode}
                  emptyHint={txt("m0176")}
                />
              </Suspense>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{txt("m0177")}</CardTitle>
              </CardHeader>
              <dl className="m-0 flex flex-col gap-5">
                <div>
                  <dt className="text-sm text-muted-foreground">{txt("m0178")}</dt>
                  <dd className="m-0 mt-2 break-all font-mono text-sm">
                    {post.slug}
                    <CopyFieldButton value={post.slug} label={txt("m0179")} />
                  </dd>
                </div>
                {[
                  [txt("m0180"), post.created_at],
                  [txt("m0181"), post.updated_at],
                  [txt("m0182"), post.published_at],
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
                    href={siteTheme ? getPublicPostUrl(post.slug, siteTheme.site_base_url) : undefined}
                    disabled={!siteTheme}
                    title={siteThemeError ? txt("m0183") : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    icon={<ExternalLink size={16} />}
                  >
                    {txt("m0184")}
                  </Button>
                ) : (
                  <p className="m-0 text-sm leading-6 text-muted-foreground">{txt("m0185")}</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
