import { Alert, Button, Spin } from "antd";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FriendLinkForm } from "@/components/admin/friend-link-form";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { getAdminLink } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function LinkEditorPage() {
  const txt = useAdminMessages();
  const { id } = useParams<{
    id: string;
  }>();
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
        title={editing ? txt("m0040") : txt("m0041")}
        description={txt("m0042")}
        actions={<Button onClick={() => router.push("/admin/links")}>{txt("m0043")}</Button>}
      />
      {editing && !valid ? (
        <Alert type="error" title={txt("m0044")} />
      ) : error ? (
        <Alert
          type="error"
          title={txt("m0045")}
          description={getAdminErrorMessage(error)}
          action={<Button onClick={() => void mutate()}>{txt("m0028")}</Button>}
        />
      ) : editing && (isLoading || !data) ? (
        <Spin />
      ) : (
        <FriendLinkForm key={id ?? "new"} initial={editing ? data : undefined} />
      )}
    </div>
  );
}
