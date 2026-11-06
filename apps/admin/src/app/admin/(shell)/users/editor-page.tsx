import { Alert, Button, Spin } from "antd";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUserForm } from "@/components/admin/admin-user-form";
import { getAdminUser } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";

export default function UserEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const userId = Number(id);
  const editing = id !== undefined;
  const validId = Number.isSafeInteger(userId) && userId > 0;
  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR(editing && validId ? ["admin-user", userId] : null, () => getAdminUser(userId));
  return (
    <div>
      <AdminPageHeader
        title={editing ? "编辑用户" : "创建用户"}
        description={
          editing
            ? "维护管理员账号的基本资料与联系方式。"
            : "创建管理员账号；创建后可在用户列表中重置登录密码。"
        }
        actions={<Button onClick={() => router.push("/admin/users")}>返回用户列表</Button>}
      />
      {editing && !validId ? (
        <Alert type="error" title="用户编号无效" />
      ) : error ? (
        <Alert
          type="error"
          title="无法加载用户"
          description={error instanceof Error ? error.message : "请稍后重试"}
          action={<Button onClick={() => void mutate()}>重试</Button>}
        />
      ) : editing && (isLoading || !user) ? (
        <Spin />
      ) : (
        <AdminUserForm key={id ?? "new"} user={editing ? user : undefined} />
      )}
    </div>
  );
}
