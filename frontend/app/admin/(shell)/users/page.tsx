"use client";

import { useState } from "react";
import { BanIcon, Loader2Icon, Trash2Icon, UserCheckIcon } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  AdminPagination,
} from "@/components/admin/admin-pagination";
import { UserAvatar } from "@/components/admin/user-avatar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { deleteAdminUser, getMe, listAdminUsers, type ProfileGender, updateAdminUserActive } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

function displayField(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

const GENDER_LABELS: Record<ProfileGender, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

function displayGender(value: ProfileGender | null | undefined) {
  if (!value) return "—";
  return GENDER_LABELS[value] ?? value;
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const { data, error, isLoading, mutate } = useSWR(
    ["admin-users", page, pageSize, search],
    () => listAdminUsers(page, pageSize, search),
  );
  const { data: me } = useSWR("auth-me", getMe);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; username: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const activeCount = data?.active_count ?? 0;
  const isOnlyUser = total <= 1;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleToggleActive(user: (typeof users)[number]) {
    const nextActive = !user.is_active;
    setTogglingId(user.id);
    try {
      await updateAdminUserActive(user.id, nextActive);
      await mutate();
      toast.success(nextActive ? "已启用" : "已禁用", {
        description: `用户「${user.username}」${nextActive ? "可正常登录" : "已被禁用"}。`,
      });
    } catch (err) {
      toast.error(nextActive ? "启用失败" : "禁用失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteTarget.id);
      await mutate();
      setDeleteTarget(null);
      toast.success("已删除", { description: `用户「${deleteTarget.username}」已移除。` });
    } catch (err) {
      toast.error("删除失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="用户"
        description="管理管理员账号；仅剩一名管理员时不可删除。禁用后该用户无法登录。"
      />

      <div className="mb-4">
        <AdminListSearch value={search} onChange={handleSearchChange} placeholder="搜索用户名、昵称、手机号、邮箱…" />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : total === 0 ? (
        <EmptyState title={search.trim() ? "无匹配结果" : "暂无用户"} description="试试其他关键词。" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">管理员账号</CardTitle>
            <CardDescription>通过 CLI 创建：`uv run python -m app.cli create-admin`</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">头像</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>出生日期</TableHead>
                  <TableHead className="hidden lg:table-cell">手机号</TableHead>
                  <TableHead className="hidden lg:table-cell">邮箱</TableHead>
                  <TableHead className="hidden sm:table-cell">角色</TableHead>
                  <TableHead className="hidden md:table-cell">状态</TableHead>
                  <TableHead className="hidden lg:table-cell">创建时间</TableHead>
                  <TableHead className="hidden xl:table-cell">最近登录</TableHead>
                  <TableHead className="w-40 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isSelf = me?.username === user.username;
                  const canDisable = user.is_active && activeCount > 1;
                  const canDelete = !isOnlyUser;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <UserAvatar username={user.username} avatarUrl={user.avatar_url} size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{displayField(user.nickname)}</TableCell>
                      <TableCell className="font-medium">
                        {user.username}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">（当前账号）</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {displayGender(user.gender)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {displayField(user.birth_date)}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                        {displayField(user.phone)}
                      </TableCell>
                      <TableCell className="hidden max-w-[12rem] truncate text-muted-foreground lg:table-cell">
                        {displayField(user.email)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">管理员</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "正常" : "已禁用"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                        {formatDateTime(user.created_at)}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                        {formatDateTime(user.last_login_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 sm:px-3"
                            disabled={togglingId === user.id || (user.is_active && !canDisable)}
                            title={
                              user.is_active && !canDisable
                                ? "无法禁用唯一的管理员"
                                : user.is_active
                                  ? "禁用"
                                  : "启用"
                            }
                            onClick={() => void handleToggleActive(user)}
                          >
                            {togglingId === user.id ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : user.is_active ? (
                              <BanIcon className="size-4 sm:mr-1" />
                            ) : (
                              <UserCheckIcon className="size-4 sm:mr-1" />
                            )}
                            <span className="hidden sm:inline">{user.is_active ? "禁用" : "启用"}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 text-destructive sm:px-3"
                            disabled={!canDelete}
                            title={canDelete ? "删除" : "无法删除唯一的管理员"}
                            onClick={() => setDeleteTarget({ id: user.id, username: user.username })}
                          >
                            <Trash2Icon className="size-4 sm:mr-1" />
                            <span className="hidden sm:inline">删除</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
          </CardContent>
        </Card>
      )}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除用户"
        description={
          deleteTarget
            ? `确定删除用户「${deleteTarget.username}」吗？此操作不可撤销，该账号将无法再登录。`
            : ""
        }
        confirmLabel="确认删除"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
