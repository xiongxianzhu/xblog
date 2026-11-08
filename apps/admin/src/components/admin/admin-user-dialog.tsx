import { Alert, Button, Modal } from "antd";
import { CopyIcon } from "lucide-react";
import { useRef, useState } from "react";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { localizeAdminNotice } from "@/lib/admin-messages";
import { type AdminUser, resetAdminUserPassword } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useAdminMessages } from "@/lib/use-admin-messages";
export function AdminUserDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const txt = useAdminMessages();
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    username: string;
    password: string;
  } | null>(null);
  async function reset() {
    if (pending.current || result) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      const credentials = await resetAdminUserPassword(user.id);
      setResult(credentials);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function copy() {
    if (!result) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(
        txt("m0363", {
          p0: result.username,
          p1: result.password,
        }),
      );
      toast.success(txt("m0364"));
    } catch {
      toast.error(txt("m0365"));
    } finally {
      setCopying(false);
    }
  }
  return (
    <Modal
      open
      centered
      title={result ? txt("m0366") : txt("m0010")}
      width={520}
      closable={!saving}
      maskClosable={false}
      onCancel={() => !saving && onClose()}
      footer={
        result
          ? [
              <Button key="close" type="primary" onClick={onClose}>
                {txt("m0367")}
              </Button>,
            ]
          : [
              <Button key="cancel" disabled={saving} onClick={onClose}>
                {txt("m0217")}
              </Button>,
              <Button key="reset" type="primary" loading={saving} onClick={() => void reset()}>
                {txt("m0368")}
              </Button>,
            ]
      }
    >
      {error ? <Alert type="error" showIcon title={localizeAdminNotice(error)} className="mb-4" /> : null}
      {result ? (
        <div className="space-y-5">
          <p>{txt("m0369")}</p>
          <div className="rounded border bg-muted/30 p-5">
            <dl className="m-0">
              <dt className="text-sm text-muted-foreground">{txt("m0370")}</dt>
              <dd id="reset-account" className="m-0 mt-2 break-all font-medium select-text">
                {result.username}
              </dd>
              <div className="my-4 border-t" />
              <dt className="text-sm text-muted-foreground">{txt("m0371")}</dt>
              <dd className="m-0 mt-2 flex items-center justify-between gap-4">
                <span
                  id="reset-password-result"
                  className="break-all font-mono text-lg font-semibold select-text"
                >
                  {result.password}
                </span>
                <Button
                  icon={<CopyIcon size={18} />}
                  loading={copying}
                  onClick={() => void copy()}
                  aria-label={txt("m0372")}
                  title={txt("m0372")}
                />
              </dd>
            </dl>
          </div>
          <p className="text-sm text-muted-foreground">{txt("m0373")}</p>
        </div>
      ) : (
        <p>{txt("resetPasswordConfirm", { name: user.username })}</p>
      )}
    </Modal>
  );
}
