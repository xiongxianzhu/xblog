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
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { adminText } from "@/lib/admin-messages";
import { deleteAdminUser, getMe, listAdminUsers, type ProfileGender, updateAdminUserActive } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { formatDateTime } from "@/lib/utils";

function displayField(value: string | null | undefined) {
  return value?.trim() ? value : "-";
}
const GENDER_LABELS: Record<ProfileGender, string> = {
  get male() {
    return adminText("m0250");
  },
  get female() {
    return adminText("m0251");
  },
  get other() {
    return adminText("m0252");
  },
};
function displayGender(value: ProfileGender | null | undefined) {
  if (!value) return "-";
  return GENDER_LABELS[value] ?? value;
}
export default function AdminUsersPage() {
  const txt = useAdminMessages();
  const router = useRouter();
  const [dialog, setDialog] = useState<{
    mode: "password";
    user: import("@/lib/api").AdminUser;
  } | null>(null);
  const [filters, setFilters] = useState({
    is_active: "",
    gender: "",
    must_change_password: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const { data, error, isLoading, mutate } = useSWR(["admin-users", page, pageSize, search, filters], () =>
    listAdminUsers(page, pageSize, search, filters),
  );
  const { data: me } = useSWR("auth-me", getMe);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    username: string;
  } | null>(null);
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
      toast.success(nextActive ? txt("m0283") : txt("m0284"), {
        description: txt("m0285", {
          p0: user.username,
          p1: nextActive ? txt("m0286") : txt("m0287"),
        }),
      });
    } catch (err) {
      toast.error(nextActive ? txt("m0288") : txt("m0289"), {
        description: getAdminErrorMessage(err),
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
      toast.success(txt("m0047"), {
        description: txt("m0290", {
          p0: deleteTarget.username,
        }),
      });
    } catch (err) {
      toast.error(txt("m0049"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div>
      <AdminPageHeader
        title={txt("m0101")}
        description={txt("m0291")}
        actions={
          <Button onClick={() => router.push("/admin/users/new")}>
            <PlusIcon className="size-4" />
            {txt("m0280")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminListSearch
          className="w-72 max-w-full shrink-0"
          value={search}
          onChange={handleSearchChange}
          placeholder={txt("m0292")}
        />

        <AdminListFilter
          label={txt("m0293")}
          value={filters.is_active}
          options={ACTIVE_FILTER_OPTIONS}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              is_active: value,
            }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label={txt("m0265")}
          value={filters.gender}
          options={[
            {
              value: "male",
              label: txt("m0250"),
            },
            {
              value: "female",
              label: txt("m0251"),
            },
            {
              value: "other",
              label: txt("m0252"),
            },
            {
              value: "unset",
              label: txt("m0294"),
            },
          ]}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              gender: value,
            }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label={txt("m0295")}
          value={filters.must_change_password}
          options={BOOLEAN_FILTER_OPTIONS}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              must_change_password: value,
            }));
            setPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">{txt("m0053")}</p>
      ) : total === 0 ? (
        <EmptyState
          title={search.trim() || Object.values(filters).some(Boolean) ? txt("m0056") : txt("m0296")}
          description={txt("m0204")}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{txt("m0297")}</CardTitle>
            <CardDescription>{txt("m0298")}</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">{txt("m0299")}</TableHead>
                  <TableHead>{txt("m0264")}</TableHead>
                  <TableHead>{txt("m0091")}</TableHead>
                  <TableHead>{txt("m0265")}</TableHead>
                  <TableHead>{txt("m0266")}</TableHead>
                  <TableHead>{txt("m0270")}</TableHead>
                  <TableHead>{txt("m0269")}</TableHead>
                  <TableHead>{txt("m0300")}</TableHead>
                  <TableHead>{txt("m0209")}</TableHead>
                  <TableHead>{txt("m0180")}</TableHead>
                  <TableHead>{txt("m0278")}</TableHead>
                  <TableHead className="w-40 text-right">{txt("m0063")}</TableHead>
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
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {txt("m0301")}
                          </span>
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
                      <TableCell>{txt("m0260")}</TableCell>
                      <TableCell>
                        <Switch
                          checked={user.is_active}
                          loading={togglingId === user.id}
                          disabled={togglingId !== null || (user.is_active && !canDisable)}
                          title={user.is_active && !canDisable ? txt("m0302") : undefined}
                          aria-label={txt("m0303", {
                            p0: user.username,
                          })}
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
                            title={txt("m0094")}
                            aria-label={txt("m0214", {
                              p0: user.username,
                            })}
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                          >
                            <EyeIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={txt("m0039")}
                            aria-label={txt("m0065", {
                              p0: user.username,
                            })}
                            onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={txt("m0010")}
                            aria-label={txt("m0304", {
                              p0: user.username,
                            })}
                            onClick={() =>
                              setDialog({
                                mode: "password",
                                user,
                              })
                            }
                          >
                            <KeyRoundIcon className="size-4" />
                          </Button>
                          <Button
                            aria-label={txt("m0066", {
                              p0: user.username,
                            })}
                            variant="ghost"
                            size="icon"
                            className="px-2 text-destructive sm:px-3"
                            disabled={!canDelete}
                            title={canDelete ? txt("m0067") : txt("m0305")}
                            onClick={() =>
                              setDeleteTarget({
                                id: user.id,
                                username: user.username,
                              })
                            }
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
        title={txt("m0306")}
        description={
          deleteTarget
            ? txt("m0307", {
                p0: deleteTarget.username,
              })
            : ""
        }
        confirmLabel={txt("m0070")}
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
