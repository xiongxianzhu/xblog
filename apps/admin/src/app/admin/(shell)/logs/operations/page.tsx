import { Alert } from "antd";
import { EyeIcon } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { AdminListFilter } from "@/components/admin/admin-list-filter";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminLogTimeRange } from "@/components/admin/admin-log-time-range";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_DEFAULT_PAGE_SIZE, AdminPagination } from "@/components/admin/admin-pagination";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OPERATION_ACTION_LABELS, operationActionLabel } from "@/lib/admin-log-labels";
import { listOperationLogs } from "@/lib/api";
import { useRouter } from "@/lib/navigation";
import { formatDateTime } from "@/lib/utils";

function displayField(value: string | null | undefined) {
  return value?.trim() ? value : "-";
}

function resourceLabel(type: string | null, id: string | null) {
  if (!type && !id) return "-";
  if (type && id) return `${type} #${id}`;
  return type ?? id ?? "-";
}

export default function AdminOperationLogsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ action: "", resource_type: "", q: "", start_at: "", end_at: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);

  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);
  const invalidRange = Boolean(
    filters.start_at && filters.end_at && Date.parse(filters.start_at) > Date.parse(filters.end_at),
  );
  const queryFilters = { ...filters, q: query };

  const { data, error, isLoading } = useSWR(
    invalidRange ? null : ["admin-operation-logs", page, pageSize, queryFilters],
    () => listOperationLogs(page, pageSize, queryFilters),
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminListSearch
          value={filters.q}
          placeholder="搜索操作者、IP、对象、操作详情…"
          className="w-72 max-w-full shrink-0"
          onChange={(q) => {
            setFilters((current) => ({ ...current, q }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label="操作类型"
          value={filters.action}
          options={Object.entries(OPERATION_ACTION_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => {
            setFilters((current) => ({ ...current, action: value }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label="对象类型"
          value={filters.resource_type}
          options={[{ value: "user", label: "用户" }]}
          onChange={(value) => {
            setFilters((current) => ({ ...current, resource_type: value }));
            setPage(1);
          }}
        />
        <AdminLogTimeRange
          start={filters.start_at}
          end={filters.end_at}
          onChange={(field, value) => {
            setFilters((current) => ({ ...current, [field]: value }));
            setPage(1);
          }}
        />
      </div>

      {invalidRange ? (
        <Alert type="error" showIcon title="开始时间不能晚于结束时间，请调整时间范围。" />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>操作记录</CardTitle>
            <CardDescription>查看后台敏感操作、操作者与变更对象。</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {(data?.items.length ?? 0) === 0 ? (
              <div>
                <EmptyState title="暂无操作日志" description="没有符合条件的记录，请调整关键词或筛选条件。" />
              </div>
            ) : (
              <>
                <div className="min-w-0">
                  <Table className="admin-log-list-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">时间</TableHead>
                        <TableHead>操作者</TableHead>
                        <TableHead>操作</TableHead>
                        <TableHead>资源</TableHead>
                        <TableHead>详情</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead className="text-right">操作</TableHead>
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
                          <TableCell className="text-muted-foreground">
                            {resourceLabel(row.resource_type, row.resource_id)}
                          </TableCell>
                          <TableCell
                            className="max-w-[16rem] truncate text-muted-foreground"
                            title={row.detail ?? undefined}
                          >
                            {displayField(row.detail)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {row.ip_address ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="查看详情"
                              aria-label={`查看日志 ${row.id} 的详情`}
                              onClick={() => router.push(`/admin/logs/operations/${row.id}`)}
                            >
                              <EyeIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
