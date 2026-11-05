import { useEffect, useState } from "react";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_DEFAULT_PAGE_SIZE, AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPanel } from "@/components/admin/admin-panel";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loginFailureLabel, loginMethodLabel } from "@/lib/admin-log-labels";
import { listLoginLogs } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

function truncate(value: string | null | undefined, max = 48) {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default function AdminLoginLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);

  const { data, error, isLoading } = useSWR(["admin-login-logs", page, pageSize], () =>
    listLoginLogs(page, pageSize),
  );

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (total > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, total, totalPages]);

  function handlePageSizeChange(nextSize: number) {
    setPageSize(nextSize);
    setPage(1);
  }

  return (
    <div>
      <AdminPageHeader title="登录日志" description="记录管理员登录尝试与结果。" />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          {(data?.items.length ?? 0) === 0 ? (
            <div className="p-6">
              <EmptyState title="暂无登录日志" description="管理员登录后会在此显示记录。" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">时间</TableHead>
                      <TableHead>用户名</TableHead>
                      <TableHead>方式</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead className="hidden md:table-cell">失败原因</TableHead>
                      <TableHead className="hidden sm:table-cell">IP</TableHead>
                      <TableHead className="hidden xl:table-cell">User-Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(row.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">{row.username}</TableCell>
                        <TableCell>{loginMethodLabel(row.method)}</TableCell>
                        <TableCell>
                          <Switch
                            disabled
                            checked={row.success}
                            aria-label="登录成功"
                            checkedChildren="成功"
                            unCheckedChildren="失败"
                          />
                        </TableCell>
                        <TableCell className="hidden max-w-[12rem] truncate text-muted-foreground md:table-cell">
                          {row.success ? "-" : loginFailureLabel(row.failure_reason)}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                          {row.ip_address ?? "—"}
                        </TableCell>
                        <TableCell
                          className="hidden max-w-[16rem] truncate text-muted-foreground xl:table-cell"
                          title={row.user_agent ?? undefined}
                        >
                          {truncate(row.user_agent, 64)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="px-4 pb-4">
                <AdminPagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                  disabled={isLoading}
                />
              </div>
            </>
          )}
        </AdminPanel>
      )}
    </div>
  );
}
