import { Alert, Button, Spin } from "antd";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUserForm } from "@/components/admin/admin-user-form";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { getAdminUser } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function UserEditorPage() {
  const txt = useAdminMessages();
  const { id } = useParams<{
    id: string;
  }>();
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
        title={editing ? txt("m0279") : txt("m0280")}
        description={editing ? txt("m0281") : txt("m0282")}
        actions={<Button onClick={() => router.push("/admin/users")}>{txt("m0255")}</Button>}
      />
      {editing && !validId ? (
        <Alert type="error" title={txt("m0256")} />
      ) : error ? (
        <Alert
          type="error"
          title={txt("m0257")}
          description={getAdminErrorMessage(error)}
          action={<Button onClick={() => void mutate()}>{txt("m0028")}</Button>}
        />
      ) : editing && (isLoading || !user) ? (
        <Spin />
      ) : (
        <AdminUserForm key={id ?? "new"} user={editing ? user : undefined} />
      )}
    </div>
  );
}
