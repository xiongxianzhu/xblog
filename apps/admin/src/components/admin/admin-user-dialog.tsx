import { Alert, Button, Modal } from "antd";
import { CopyIcon } from "lucide-react";
import { useRef, useState } from "react";
import { type AdminUser, resetAdminUserPassword } from "@/lib/api";
import { toast } from "@/lib/feedback";

export function AdminUserDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ username: string; password: string } | null>(null);

  async function reset() {
    if (pending.current || result) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      const credentials = await resetAdminUserPassword(user.id);
      setResult(credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败，请稍后重试");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  async function copy() {
    if (!result) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(`账号：${result.username}\n密码：${result.password}`);
      toast.success("账号和密码已复制");
    } catch {
      toast.error("复制失败，请选中下方账号和密码手动复制");
    } finally {
      setCopying(false);
    }
  }

  return (
    <Modal
      open
      centered
      title={result ? "密码重置成功" : "重置密码"}
      width={520}
      closable={!saving}
      maskClosable={false}
      onCancel={() => !saving && onClose()}
      footer={
        result
          ? [
              <Button key="close" type="primary" onClick={onClose}>
                我已记录
              </Button>,
            ]
          : [
              <Button key="cancel" disabled={saving} onClick={onClose}>
                取消
              </Button>,
              <Button key="reset" type="primary" loading={saving} onClick={() => void reset()}>
                确认重置
              </Button>,
            ]
      }
    >
      {error ? <Alert type="error" showIcon title={error} className="mb-4" /> : null}
      {result ? (
        <div className="space-y-5">
          <p>请记录以下账号凭据并告知用户。</p>
          <div className="rounded border bg-muted/30 p-5">
            <dl className="m-0">
              <dt className="text-sm text-muted-foreground">账号</dt>
              <dd id="reset-account" className="m-0 mt-2 break-all font-medium select-text">
                {result.username}
              </dd>
              <div className="my-4 border-t" />
              <dt className="text-sm text-muted-foreground">临时密码</dt>
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
                  aria-label="一键复制账号和密码"
                  title="一键复制账号和密码"
                />
              </dd>
            </dl>
          </div>
          <p className="text-sm text-muted-foreground">
            关闭后将不再显示此临时密码。用户下次登录时必须设置新密码。
          </p>
        </div>
      ) : (
        <p>确定重置用户「{user.username}」的密码吗？系统将随机生成新密码，旧密码将无法用于登录。</p>
      )}
    </Modal>
  );
}
