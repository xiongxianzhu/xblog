import { EyeIcon, KeyRoundIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import {
  ACTIVE_FILTER_OPTIONS,
  AdminListFilter,
  BOOLEAN_FILTER_OPTIONS,
} from "@/components/admin/admin-list-filter";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_DEFAULT_PAGE_SIZE, AdminPagination } from "@/components/admin/admin-pagination";
import { AdminUserDialog } from "@/components/admin/admin-user-dialog";
import { UserAvatar } from "@/components/admin/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteAdminUser, getMe, listAdminUsers, type ProfileGender, updateAdminUserActive } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useRouter } from "@/lib/navigation";
import { formatDateTime } from "@/lib/utils";

function displayField(value: string | null | undefined) {
  return value?.trim() ? value : "-";
}

const GENDER_LABELS: Record<ProfileGender, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

function displayGender(value: ProfileGender | null | undefined) {
  if (!value) return "-";
  return GENDER_LABELS[value] ?? value;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [dialog, setDialog] = useState<{
    mode: "password";
    user: import("@/lib/api").AdminUser;
  } | null>(null);
  const [filters, setFilters] = useState({ is_active: "", gender: "", must_change_password: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const { data, error, isLoading, mutate } = useSWR(["admin-users", page, pageSize, search, filters], () =>
    listAdminUsers(page, pageSize, search, filters),
  );
  const { data: me } = useSWR("auth-me", getMe);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; username: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const activeCount = data?.active_count ?? 0;

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
        description="创建和维护管理员账号，管理账号状态与登录密码。"
        actions={
          <Button onClick={() => router.push("/admin/users/new")}>
            <PlusIcon className="size-4" />
            创建用户
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminListSearch
          className="w-72 max-w-full shrink-0"
          value={search}
          onChange={handleSearchChange}
          placeholder="搜索用户名、昵称、手机号、邮箱…"
        />

        <AdminListFilter
          label="启用状态"
          value={filters.is_active}
          options={ACTIVE_FILTER_OPTIONS}
          onChange={(value) => {
            setFilters((current) => ({ ...current, is_active: value }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label="性别"
          value={filters.gender}
          options={[
            { value: "male", label: "男" },
            { value: "female", label: "女" },
            { value: "other", label: "其他" },
            { value: "unset", label: "未设置" },
          ]}
          onChange={(value) => {
            setFilters((current) => ({ ...current, gender: value }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label="改密状态"
          value={filters.must_change_password}
          options={BOOLEAN_FILTER_OPTIONS}
          onChange={(value) => {
            setFilters((current) => ({ ...current, must_change_password: value }));
            setPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : total === 0 ? (
        <EmptyState
          title={search.trim() || Object.values(filters).some(Boolean) ? "无匹配结果" : "暂无用户"}
          description="请调整关键词或筛选条件。"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">管理员账号</CardTitle>
            <CardDescription>所有账号均拥有管理员权限；至少保留一名启用的管理员。</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">头像</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>出生日期</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>最近登录</TableHead>
                  <TableHead className="w-40 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isSelf = me?.username === user.username;
                  const canDisable = user.is_active && activeCount > 1;
                  const canDelete = !user.is_active || activeCount > 1;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <UserAvatar preview username={user.username} avatarUrl={user.avatar_url} size="sm" />
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
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {displayField(user.phone)}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                        {displayField(user.email)}
                      </TableCell>
                      <TableCell>管理员</TableCell>
                      <TableCell>
                        <Switch
                          checked={user.is_active}
                          loading={togglingId === user.id}
                          disabled={togglingId !== null || (user.is_active && !canDisable)}
                          title={user.is_active && !canDisable ? "无法禁用唯一的管理员" : undefined}
                          aria-label={`启用用户 ${user.username}`}
                          onCheckedChange={() => void handleToggleActive(user)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(user.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(user.last_login_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="查看详情"
                            aria-label={`查看 ${user.username} 的详情`}
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                          >
                            <EyeIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="编辑"
                            aria-label={`编辑 ${user.username}`}
                            onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="重置密码"
                            aria-label={`重置 ${user.username} 的密码`}
                            onClick={() => setDialog({ mode: "password", user })}
                          >
                            <KeyRoundIcon className="size-4" />
                          </Button>
                          <Button
                            aria-label={`删除 ${user.username}`}
                            variant="ghost"
                            size="icon"
                            className="px-2 text-destructive sm:px-3"
                            disabled={!canDelete}
                            title={canDelete ? "删除" : "无法删除唯一的管理员"}
                            onClick={() => setDeleteTarget({ id: user.id, username: user.username })}
                          >
                            <Trash2Icon className="size-4" />
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

      {dialog ? <AdminUserDialog user={dialog.user} onClose={() => setDialog(null)} /> : null}

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
