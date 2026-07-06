"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { PenLineIcon, PinIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { AdminListSearch } from "@/components/admin/admin-list-search";
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  AdminPagination,
} from "@/components/admin/admin-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanel } from "@/components/admin/admin-panel";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePost, listAdminPosts, updatePost } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminPostsPage() {
  const tFeedback = useTranslations("admin.feedback");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const { data, error, isLoading, mutate } = useSWR(
    ["admin-posts", page, pageSize, search],
    () => listAdminPosts(page, pageSize, search),
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [pinningId, setPinningId] = useState<number | null>(null);

  const posts = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function confirmDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await deletePost(deleteId);
      await mutate();
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePublish(id: number, title: string) {
    setPublishingId(id);
    try {
      await updatePost(id, { status: "published" });
      await mutate();
      toast.success(tFeedback("published"), {
        description: `文章「${title}」已发布。`,
      });
    } catch (err) {
      toast.error(tFeedback("publishFailed"), {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setPublishingId(null);
    }
  }

  async function handleTogglePin(id: number, title: string, isPinned: boolean) {
    setPinningId(id);
    try {
      await updatePost(id, { is_pinned: !isPinned });
      await mutate();
      toast.success(!isPinned ? "已置顶" : "已取消置顶", {
        description: `文章「${title}」${!isPinned ? "将在列表优先展示" : "已恢复普通排序"}。`,
      });
    } catch (err) {
      toast.error("操作失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setPinningId(null);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground">加载失败，请刷新页面重试。</p>
        <Button asChild variant="outline">
          <Link href="/admin/posts">刷新</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="文章"
        description="创建、编辑与发布 Markdown 文章"
        actions={
          <Button asChild>
            <Link href="/admin/posts/new">
              <PlusIcon data-icon="inline-start" />
              新建文章
            </Link>
          </Button>
        }
      />

      <div className="mb-4">
        <AdminListSearch value={search} onChange={handleSearchChange} placeholder="搜索标题、slug、摘要…" />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {!isLoading && total === 0 ? (
        <EmptyState
          title={search.trim() ? "无匹配结果" : "暂无文章"}
          description={search.trim() ? "试试其他关键词。" : "点击「新建文章」开始写作。"}
        />
      ) : null}

      {!isLoading && posts.length > 0 ? (
        <AdminPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead className="hidden sm:table-cell">状态</TableHead>
                <TableHead className="hidden md:table-cell">更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-[12rem] sm:max-w-[240px]">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{post.title}</span>
                        {post.is_pinned ? (
                          <Badge variant="outline" className="shrink-0 gap-1 px-1.5 py-0 text-[10px]">
                            <PinIcon className="size-3" />
                            置顶
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:hidden">
                        <Badge variant={post.status === "published" ? "default" : "muted"}>
                          {post.status === "published" ? "已发布" : "草稿"}
                        </Badge>
                        {post.updated_at ? (
                          <span className="text-xs text-muted-foreground">{formatDate(post.updated_at)}</span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={post.status === "published" ? "default" : "muted"}>
                      {post.status === "published" ? "已发布" : "草稿"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {post.updated_at ? formatDate(post.updated_at) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 sm:px-3"
                        aria-label={post.is_pinned ? `取消置顶 ${post.title}` : `置顶 ${post.title}`}
                        disabled={pinningId === post.id}
                        onClick={() => void handleTogglePin(post.id, post.title, post.is_pinned)}
                      >
                        <PinIcon className={`size-4 sm:mr-1 ${post.is_pinned ? "fill-current text-primary" : ""}`} />
                        <span className="hidden sm:inline">{post.is_pinned ? "取消置顶" : "置顶"}</span>
                      </Button>
                      {post.status !== "published" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 sm:px-3"
                          aria-label={`发布 ${post.title}`}
                          disabled={publishingId === post.id}
                          onClick={() => void handlePublish(post.id, post.title)}
                        >
                          <SendIcon className="size-4 sm:mr-1" />
                          <span className="hidden sm:inline">
                            {publishingId === post.id ? "发布中…" : "发布"}
                          </span>
                        </Button>
                      ) : null}
                      <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
                        <Link href={`/admin/posts/${post.id}/edit`} aria-label={`编辑 ${post.title}`}>
                          <PenLineIcon className="size-4 sm:mr-1" />
                          <span className="hidden sm:inline">编辑</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-destructive sm:px-3"
                        aria-label={`删除 ${post.title}`}
                        onClick={() => setDeleteId(post.id)}
                      >
                        <Trash2Icon className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">删除</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
            disabled={isLoading}
          />
        </AdminPanel>
      ) : null}

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除文章</DialogTitle>
            <DialogDescription>此操作不可撤销，确定要删除这篇文章吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? "删除中…" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
