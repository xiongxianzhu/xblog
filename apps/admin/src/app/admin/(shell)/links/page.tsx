import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminFeedbackDialog, type AdminFeedbackVariant } from "@/components/admin/admin-feedback-dialog";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { adminFlatButtonClass } from "@/components/admin/ai-assistant-form-styles";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteAdminLink, listAdminLinks } from "@/lib/api";
import { matchQuery } from "@/lib/match-query";
import { useRouter } from "@/lib/navigation";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import type { FriendLinkPublic } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AdminLinksPage() {
  const router = useRouter();
  const { data: links, error, isLoading, mutate } = useSWR("admin-links", listAdminLinks);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FriendLinkPublic | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    variant: AdminFeedbackVariant;
    title: string;
    message?: string;
  }>({ open: false, variant: "success", title: "" });

  const filtered = useMemo(
    () =>
      (links ?? []).filter((link) =>
        matchQuery(search, link.name, link.url, link.logo_url, link.description, link.sort_order),
      ),
    [links, search],
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminLink(deleteTarget.id);
      await mutate();
      setDeleteTarget(null);
      setFeedback({ open: true, variant: "success", title: "已删除", message: "友链已移除。" });
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "删除失败",
        message: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="友链"
        description="维护公开页 /links 展示的友情链接，按排序值升序排列。"
        actions={
          <Button onClick={() => router.push("/admin/links/new")} className={adminFlatButtonClass}>
            <PlusIcon data-icon="inline-start" />
            添加友链
          </Button>
        }
      />

      <div className="mb-4">
        <AdminListSearch value={search} onChange={setSearch} placeholder="搜索名称、URL、简介…" />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">加载失败，请刷新页面。</p> : null}

      {!isLoading && !error && (links ?? []).length === 0 ? (
        <EmptyState title="暂无友链" description="点击「添加友链」创建第一条。" />
      ) : null}

      {!isLoading && !error && (links ?? []).length > 0 && filtered.length === 0 ? (
        <EmptyState title="无匹配结果" description="试试其他关键词。" />
      ) : null}

      {!isLoading && filtered.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>友链列表</CardTitle>
            <CardDescription>管理友链信息与展示顺序，保存后同步到公开站。</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">排序</TableHead>
                  <TableHead className="w-16">LOGO</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>简介</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((link) => {
                  const logoPreview = resolveAdminAssetPreviewUrl(link.logo_url);
                  return (
                    <TableRow key={link.id}>
                      <TableCell className="text-muted-foreground">{link.sort_order}</TableCell>
                      <TableCell>
                        <div className="mx-auto flex size-10 items-center justify-center">
                          {logoPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoPreview} alt="" className="max-h-10 max-w-10 object-contain" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{link.name}</TableCell>
                      <TableCell className="max-w-xs text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <span className="min-w-0 truncate">{link.url}</span>
                          <CopyFieldButton value={link.url} label="友链地址" />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                        {link.description?.trim() ? link.description : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label={`编辑 ${link.name}`}
                            title="编辑"
                            variant="ghost"
                            size="icon"
                            className={adminFlatButtonClass}
                            onClick={() => router.push(`/admin/links/${link.id}/edit`)}
                          >
                            <PencilIcon data-icon="inline-start" />
                          </Button>
                          <Button
                            aria-label={`删除 ${link.name}`}
                            title="删除"
                            variant="ghost"
                            size="icon"
                            className={cn("text-destructive", adminFlatButtonClass)}
                            onClick={() => setDeleteTarget(link)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除友链"
        description={deleteTarget ? `确定删除「${deleteTarget.name}」吗？此操作不可撤销。` : ""}
        confirmLabel="确认删除"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      <AdminFeedbackDialog
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
