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
import { useAdminMessages } from "@/lib/use-admin-messages";
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
  const txt = useAdminMessages();
  const router = useRouter();
  const [filters, setFilters] = useState({
    action: "",
    resource_type: "",
    q: "",
    start_at: "",
    end_at: "",
  });
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
  const queryFilters = {
    ...filters,
    q: query,
  };
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
      <AdminPageHeader title={txt("m0096")} description={txt("m0097")} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminListSearch
          value={filters.q}
          placeholder={txt("m0098")}
          className="w-72 max-w-full shrink-0"
          onChange={(q) => {
            setFilters((current) => ({
              ...current,
              q,
            }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label={txt("m0099")}
          value={filters.action}
          options={Object.entries(OPERATION_ACTION_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              action: value,
            }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label={txt("m0100")}
          value={filters.resource_type}
          options={[
            {
              value: "user",
              label: txt("m0101"),
            },
          ]}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              resource_type: value,
            }));
            setPage(1);
          }}
        />
        <AdminLogTimeRange
          start={filters.start_at}
          end={filters.end_at}
          onChange={(field, value) => {
            setFilters((current) => ({
              ...current,
              [field]: value,
            }));
            setPage(1);
          }}
        />
      </div>

      {invalidRange ? (
        <Alert type="error" showIcon title={txt("m0085")} />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">{txt("m0053")}</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{txt("m0102")}</CardTitle>
            <CardDescription>{txt("m0103")}</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {(data?.items.length ?? 0) === 0 ? (
              <div>
                <EmptyState title={txt("m0104")} description={txt("m0089")} />
              </div>
            ) : (
              <>
                <div className="min-w-0">
                  <Table className="admin-log-list-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">{txt("m0090")}</TableHead>
                        <TableHead>{txt("m0105")}</TableHead>
                        <TableHead>{txt("m0063")}</TableHead>
                        <TableHead>{txt("m0106")}</TableHead>
                        <TableHead>{txt("m0107")}</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead className="text-right">{txt("m0063")}</TableHead>
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
                              title={txt("m0094")}
                              aria-label={txt("m0095", {
                                p0: row.id,
                              })}
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
