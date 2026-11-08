import { Alert, Button, Spin } from "antd";
import useSWR from "swr";
import { AdminLogDetail } from "@/components/admin/admin-log-detail";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { getLoginLog, getOperationLog } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function LogDetailPage({ kind }: { kind: "login" | "operation" }) {
  const txt = useAdminMessages();
  const { id } = useParams<{
    id: string;
  }>();
  const router = useRouter();
  const logId = Number(id);
  const valid = Number.isSafeInteger(logId) && logId > 0;
  const { data, error, isLoading, mutate } = useSWR(
    valid ? ["admin-log-detail", kind, logId] : null,
    async () =>
      kind === "login"
        ? {
            kind: "login" as const,
            row: await getLoginLog(logId),
          }
        : {
            kind: "operation" as const,
            row: await getOperationLog(logId),
          },
  );
  return (
    <div>
      <AdminPageHeader
        title={kind === "login" ? txt("m0071") : txt("m0072")}
        description={txt("m0073")}
        actions={
          <Button
            onClick={() => router.push(kind === "login" ? "/admin/logs/login" : "/admin/logs/operations")}
          >
            {txt("m0074")}
          </Button>
        }
      />
      {!valid ? (
        <Alert type="error" title={txt("m0075")} />
      ) : error ? (
        <Alert
          type="error"
          title={txt("m0076")}
          description={getAdminErrorMessage(error)}
          action={<Button onClick={() => void mutate()}>{txt("m0028")}</Button>}
        />
      ) : isLoading || !data ? (
        <Spin />
      ) : (
        <AdminLogDetail {...data} />
      )}
    </div>
  );
}
