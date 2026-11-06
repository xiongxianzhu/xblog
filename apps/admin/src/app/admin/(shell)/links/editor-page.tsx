import { Alert, Button, Spin } from "antd";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FriendLinkForm } from "@/components/admin/friend-link-form";
import { getAdminLink } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";

export default function LinkEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const editing = id !== undefined;
  const linkId = Number(id);
  const valid = Number.isSafeInteger(linkId) && linkId > 0;
  const { data, error, isLoading, mutate } = useSWR(editing && valid ? ["admin-link", linkId] : null, () =>
    getAdminLink(linkId),
  );
  return (
    <div>
      <AdminPageHeader
        title={editing ? "编辑友链" : "添加友链"}
        description="维护公开站友链信息与展示顺序。"
        actions={<Button onClick={() => router.push("/admin/links")}>返回友链列表</Button>}
      />
      {editing && !valid ? (
        <Alert type="error" title="友链编号无效" />
      ) : error ? (
        <Alert
          type="error"
          title="无法加载友链"
          description={error instanceof Error ? error.message : "请稍后重试"}
          action={<Button onClick={() => void mutate()}>重试</Button>}
        />
      ) : editing && (isLoading || !data) ? (
        <Spin />
      ) : (
        <FriendLinkForm key={id ?? "new"} initial={editing ? data : undefined} />
      )}
    </div>
  );
}
