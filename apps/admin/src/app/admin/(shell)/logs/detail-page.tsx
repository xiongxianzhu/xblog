import { Alert, Button, Spin } from "antd";
import useSWR from "swr";
import { AdminLogDetail } from "@/components/admin/admin-log-detail";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getLoginLog, getOperationLog } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";

export default function LogDetailPage({ kind }: { kind: "login" | "operation" }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const logId = Number(id);
  const valid = Number.isSafeInteger(logId) && logId > 0;
  const { data, error, isLoading, mutate } = useSWR(
    valid ? ["admin-log-detail", kind, logId] : null,
    async () =>
      kind === "login"
        ? { kind: "login" as const, row: await getLoginLog(logId) }
        : { kind: "operation" as const, row: await getOperationLog(logId) },
  );
  return (
    <div>
      <AdminPageHeader
        title={kind === "login" ? "登录日志详情" : "操作日志详情"}
        description="查看事件经过、账号信息与访问来源。"
        actions={
          <Button
            onClick={() => router.push(kind === "login" ? "/admin/logs/login" : "/admin/logs/operations")}
          >
            返回日志列表
          </Button>
        }
      />
      {!valid ? (
        <Alert type="error" title="日志编号无效" />
      ) : error ? (
        <Alert
          type="error"
          title="无法加载日志"
          description={error instanceof Error ? error.message : "请稍后重试"}
          action={<Button onClick={() => void mutate()}>重试</Button>}
        />
      ) : isLoading || !data ? (
        <Spin />
      ) : (
        <AdminLogDetail {...data} />
      )}
    </div>
  );
}
