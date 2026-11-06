import { Alert, Button, Spin, Tag } from "antd";
import { CalendarDays, Clock3, KeyRound, Pencil, UserRound } from "lucide-react";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminUser } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";
import { formatDateTime } from "@/lib/utils";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const userId = Number(id);
  const validId = Number.isSafeInteger(userId) && userId > 0;
  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR(validId ? ["admin-user", userId] : null, () => getAdminUser(userId));
  const gender = { male: "男", female: "女", other: "其他" };
  return (
    <div>
      <AdminPageHeader
        title="用户详情"
        description="查看管理员账号的完整资料与状态。"
        actions={<Button onClick={() => router.push("/admin/users")}>返回用户列表</Button>}
      />
      {!validId ? (
        <Alert type="error" title="用户编号无效" />
      ) : error ? (
        <Alert
          type="error"
          title="无法加载用户"
          description={error instanceof Error ? error.message : "请稍后重试"}
          action={<Button onClick={() => void mutate()}>重试</Button>}
        />
      ) : isLoading || !user ? (
        <Spin />
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <UserAvatar preview username={user.username} avatarUrl={user.avatar_url} size="lg" />
                <div className="min-w-0">
                  <h2 className="m-0 break-words text-xl font-semibold">{user.nickname || user.username}</h2>
                  <p className="mb-0 mt-1 break-all text-sm text-muted-foreground">
                    @{user.username} · 用户 #{user.id}
                    <CopyFieldButton value={user.id} label="用户 ID" />
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag>管理员</Tag>
                    <Tag color={user.is_active ? "success" : "default"}>
                      {user.is_active ? "账号已启用" : "账号已禁用"}
                    </Tag>
                  </div>
                </div>
              </div>
              <Button icon={<Pencil size={16} />} onClick={() => router.push(`/admin/users/${user.id}/edit`)}>
                编辑资料
              </Button>
            </div>
          </Card>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound size={18} />
                  个人资料
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  {[
                    ["用户名", user.username],
                    ["昵称", user.nickname || "-"],
                    ["性别", user.gender ? gender[user.gender] : "-"],
                    ["出生日期", user.birth_date || "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="m-0 mt-2 flex items-center gap-1 font-medium">
                        <span className="min-w-0 break-words">{value}</span>
                        {label === "用户名" ? (
                          <CopyFieldButton value={value} label={label ?? "字段"} />
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-7 border-t pt-6">
                  <h3 className="mb-5 mt-0 text-sm font-semibold">联系方式</h3>
                  <dl className="m-0 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {[
                      ["邮箱", user.email],
                      ["手机号", user.phone],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-sm text-muted-foreground">{label}</dt>
                        <dd className="m-0 mt-2 flex items-center gap-1 font-medium">
                          <span className="min-w-0 break-all">{value || "-"}</span>
                          <CopyFieldButton value={value} label={label ?? "联系方式"} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound size={18} />
                    登录与密码
                  </CardTitle>
                </CardHeader>
                <p className="mb-2 font-medium">
                  {user.must_change_password ? "等待设置新密码" : "无需强制改密"}
                </p>
                <p className="mb-0 text-sm leading-6 text-muted-foreground">
                  {user.must_change_password
                    ? "该账号下次登录后，需先设置新密码才能进入后台。"
                    : "该账号没有待完成的强制改密要求。"}
                </p>
                {!user.is_active ? (
                  <p className="mb-0 mt-3 text-sm text-muted-foreground">账号当前已禁用，无法登录。</p>
                ) : null}
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 size={18} />
                    账号记录
                  </CardTitle>
                </CardHeader>
                <dl className="m-0 space-y-5">
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays size={15} />
                      创建时间
                    </dt>
                    <dd className="m-0 mt-2 pl-6 tabular-nums">{formatDateTime(user.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 size={15} />
                      最近登录
                    </dt>
                    <dd className="m-0 mt-2 pl-6 tabular-nums">
                      {user.last_login_at ? formatDateTime(user.last_login_at) : "-"}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
