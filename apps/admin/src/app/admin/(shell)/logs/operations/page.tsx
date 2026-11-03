import { useEffect, useState } from "react";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_DEFAULT_PAGE_SIZE, AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPanel } from "@/components/admin/admin-panel";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { operationActionLabel } from "@/lib/admin-log-labels";
import { listOperationLogs } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

function displayField(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

function resourceLabel(type: string | null, id: string | null) {
  if (!type && !id) return "—";
  if (type && id) return `${type} #${id}`;
  return type ?? id ?? "—";
}

export default function AdminOperationLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);

  const { data, error, isLoading } = useSWR(["admin-operation-logs", page, pageSize], () =>
    listOperationLogs(page, pageSize),
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
      <AdminPageHeader title="操作日志" description="记录后台敏感操作与变更。" />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          {(data?.items.length ?? 0) === 0 ? (
            <div className="p-6">
              <EmptyState title="暂无操作日志" description="启用用户、禁用用户等操作会在此显示。" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">时间</TableHead>
                      <TableHead>操作者</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead className="hidden md:table-cell">资源</TableHead>
                      <TableHead className="hidden lg:table-cell">详情</TableHead>
                      <TableHead className="hidden sm:table-cell">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(row.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">{row.username}</TableCell>
                        <TableCell>{operationActionLabel(row.action)}</TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {resourceLabel(row.resource_type, row.resource_id)}
                        </TableCell>
                        <TableCell
                          className="hidden max-w-[16rem] truncate text-muted-foreground lg:table-cell"
                          title={row.detail ?? undefined}
                        >
                          {displayField(row.detail)}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                          {row.ip_address ?? "—"}
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
