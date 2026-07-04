"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { PenLineIcon, PlusIcon, Trash2Icon } from "lucide-react";

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
import { deletePost, listAdminPosts } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminPostsPage() {
  const { data: posts, error, isLoading, mutate } = useSWR("admin-posts", listAdminPosts);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {!isLoading && (posts ?? []).length === 0 ? (
        <EmptyState title="暂无文章" description="点击「新建文章」开始写作。" />
      ) : null}

      {!isLoading && (posts ?? []).length > 0 ? (
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
              {(posts ?? []).map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-[240px] truncate font-medium">{post.title}</TableCell>
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
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/posts/${post.id}/edit`}>
                          <PenLineIcon data-icon="inline-start" />
                          编辑
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(post.id)}>
                        <Trash2Icon data-icon="inline-start" />
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
