"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminFeedbackDialog, type AdminFeedbackVariant } from "@/components/admin/admin-feedback-dialog";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanel } from "@/components/admin/admin-panel";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createAdminLink,
  deleteAdminLink,
  listAdminLinks,
  updateAdminLink,
} from "@/lib/api";
import { matchQuery } from "@/lib/match-query";
import type { FriendLinkPublic } from "@/lib/types";

type LinkForm = {
  name: string;
  url: string;
  logo_url: string;
  sort_order: string;
};

const emptyForm: LinkForm = {
  name: "",
  url: "",
  logo_url: "",
  sort_order: "0",
};

export default function AdminLinksPage() {
  const { data: links, error, isLoading, mutate } = useSWR("admin-links", listAdminLinks);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FriendLinkPublic | null>(null);
  const [form, setForm] = useState<LinkForm>(emptyForm);
  const [saving, setSaving] = useState(false);
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
        matchQuery(search, link.name, link.url, link.logo_url, link.sort_order),
      ),
    [links, search],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(link: FriendLinkPublic) {
    setEditing(link);
    setForm({
      name: link.name,
      url: link.url,
      logo_url: link.logo_url ?? "",
      sort_order: String(link.sort_order),
    });
    setOpen(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    const url = form.url.trim();
    if (!name || !url) {
      setFeedback({ open: true, variant: "error", title: "保存失败", message: "名称与链接不能为空。" });
      return;
    }
    const sort_order = Number.parseInt(form.sort_order, 10);
    const payload = {
      name,
      url,
      logo_url: form.logo_url.trim() || null,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateAdminLink(editing.id, payload);
      } else {
        await createAdminLink(payload);
      }
      await mutate();
      setOpen(false);
      setFeedback({
        open: true,
        variant: "success",
        title: editing ? "已更新" : "已添加",
        message: `友链「${name}」已保存。`,
      });
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "保存失败",
        message: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setSaving(false);
    }
  }

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
          <Button onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            添加友链
          </Button>
        }
      />

      <div className="mb-4">
        <AdminListSearch value={search} onChange={setSearch} placeholder="搜索名称、URL…" />
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
        <AdminPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">排序</TableHead>
                <TableHead>名称</TableHead>
                <TableHead className="hidden md:table-cell">URL</TableHead>
                <TableHead className="hidden lg:table-cell">LOGO</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="text-muted-foreground">{link.sort_order}</TableCell>
                  <TableCell className="font-medium">{link.name}</TableCell>
                  <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                    {link.url}
                  </TableCell>
                  <TableCell className="hidden max-w-[160px] truncate text-muted-foreground lg:table-cell">
                    {link.logo_url ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(link)}>
                        <PencilIcon data-icon="inline-start" />
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(link)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑友链" : "添加友链"}</DialogTitle>
            <DialogDescription>保存后公开页 /links 会按排序值展示。</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>名称</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </Field>
            <Field>
              <FieldLabel>链接 URL</FieldLabel>
              <Input
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://example.com"
                required
              />
            </Field>
            <Field>
              <FieldLabel>LOGO URL（可选）</FieldLabel>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </Field>
            <Field>
              <FieldLabel>排序</FieldLabel>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  保存中…
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
