import { Button, Tag } from "antd";
import { CheckCircle2, CircleX, Clock3, FileText, Globe, UserRound } from "lucide-react";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { loginFailureLabel, loginMethodLabel, operationActionLabel } from "@/lib/admin-log-labels";
import type { LoginLogAdmin, OperationLogAdmin } from "@/lib/api";
import { useRouter } from "@/lib/navigation";
import { formatDateTime } from "@/lib/utils";

type Props = { kind: "login"; row: LoginLogAdmin } | { kind: "operation"; row: OperationLogAdmin };

export function AdminLogDetail(props: Props) {
  const { row } = props;
  const router = useRouter();
  const title =
    props.kind === "login"
      ? props.row.success
        ? "登录成功"
        : "登录失败"
      : operationActionLabel(props.row.action);
  const failed = props.kind === "login" && !props.row.success;
  const StatusIcon = props.kind === "operation" ? FileText : failed ? CircleX : CheckCircle2;
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start gap-3">
          <StatusIcon
            size={24}
            className={failed ? "mt-1 shrink-0 text-destructive" : "mt-1 shrink-0 text-primary"}
          />
          <div className="min-w-0">
            <h2 className="m-0 break-words text-xl font-semibold">{title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Tag>{props.kind === "login" ? loginMethodLabel(props.row.method) : "操作记录"}</Tag>
              <span className="flex items-center gap-1.5">
                <Clock3 size={14} />
                {formatDateTime(row.created_at)}
              </span>
              <span>
                记录 #{row.id}
                <CopyFieldButton value={row.id} label="记录 ID" />
              </span>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{props.kind === "login" ? "登录信息" : "事件内容"}</CardTitle>
          </CardHeader>
          {props.kind === "login" ? (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">{failed ? "失败原因" : "结果说明"}</p>
                <p className="m-0 break-words font-medium">
                  {failed ? loginFailureLabel(props.row.failure_reason) : "本次登录验证通过。"}
                </p>
                {props.row.failure_reason ? (
                  <p className="mb-0 mt-2 break-all font-mono text-xs text-muted-foreground">
                    {props.row.failure_reason}
                  </p>
                ) : null}
              </div>
              <div className="border-t pt-6">
                <h3 className="mb-3 mt-0 text-sm font-semibold">
                  浏览器与设备 · User-Agent
                  <CopyFieldButton value={props.row.user_agent} label="User-Agent" />
                </h3>
                <p className="m-0 whitespace-pre-wrap break-all rounded border bg-muted/30 p-4 font-mono text-xs leading-6">
                  {props.row.user_agent || "-"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <dl className="m-0 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">对象类型</dt>
                  <dd className="m-0 mt-2 font-medium">
                    {props.row.resource_type === "user" ? "用户" : props.row.resource_type || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">对象 ID</dt>
                  <dd className="m-0 mt-2 break-all font-mono">
                    {props.row.resource_id || "-"}
                    <CopyFieldButton value={props.row.resource_id} label="对象 ID" />
                  </dd>
                </div>
              </dl>
              <div className="border-t pt-6">
                <h3 className="mb-3 mt-0 text-sm font-semibold">
                  操作详情
                  <CopyFieldButton value={props.row.detail} label="操作详情" />
                </h3>
                <p className="m-0 whitespace-pre-wrap break-words leading-7 [overflow-wrap:anywhere]">
                  {props.row.detail || "-"}
                </p>
              </div>
              <p className="m-0 break-all font-mono text-xs text-muted-foreground">
                操作标识：{props.row.action}
                <CopyFieldButton value={props.row.action} label="操作标识" />
              </p>
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound size={18} />
                {props.kind === "login" ? "登录账号" : "操作者"}
              </CardTitle>
            </CardHeader>
            <p className="mb-1 break-all text-lg font-medium">
              {row.username || "-"}
              <CopyFieldButton value={row.username} label="用户名" />
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              用户 ID：{row.user_id ?? "-"}
              <CopyFieldButton value={row.user_id} label="用户 ID" />
            </p>
            {row.user_id !== null && row.user_id !== undefined ? (
              <Button onClick={() => router.push(`/admin/users/${row.user_id}`)}>查看用户详情</Button>
            ) : null}
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={18} />
                访问来源
              </CardTitle>
            </CardHeader>
            <p className="mb-2 text-sm text-muted-foreground">IP 地址</p>
            <p className="m-0 break-all font-mono">
              {row.ip_address || "-"}
              <CopyFieldButton value={row.ip_address} label="IP 地址" />
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
