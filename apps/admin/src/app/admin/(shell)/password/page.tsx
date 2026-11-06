import { useState } from "react";
import { useSWRConfig } from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { changePassword, logout } from "@/lib/api";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const adminFieldClass = cn(adminBorderlessControlClass, adminBorderlessFocusClass);

export default function AdminPasswordPage({ requiredChange = false }: { requiredChange?: boolean }) {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("新密码至少 8 个字符");
      return;
    }
    if (!requiredChange && newPassword === currentPassword) {
      setError("新密码不能与当前密码相同");
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setError("密码 UTF-8 编码不得超过 72 字节");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    try {
      await changePassword(requiredChange ? undefined : currentPassword, newPassword);
      setSuccess("新密码已设置");
      await Promise.all([mutate("auth-me"), mutate("admin-me")]);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.replace(requiredChange ? "/admin/dashboard" : "/admin/profile");
    } catch (err) {
      const message = err instanceof Error ? err.message : "修改失败";
      setError(message === "Current password is incorrect" ? "当前密码不正确" : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title={requiredChange ? "设置新密码" : "修改密码"}
        description={
          requiredChange ? "首次登录或密码被重置后，需先设置新密码才能进入后台。" : "更新管理员登录密码。"
        }
      />

      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {!requiredChange ? (
                <Field>
                  <FieldLabel htmlFor="current-password">当前密码</FieldLabel>
                  <PasswordInput
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={adminFieldClass}
                  />
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="new-password">新密码</FieldLabel>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className={adminFieldClass}
                />
              </Field>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="confirm-password">确认新密码</FieldLabel>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className={adminFieldClass}
                />
                {error ? <FieldError>{error}</FieldError> : null}
                {success ? <p className="text-sm text-primary">{success}</p> : null}
              </Field>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "保存中…" : "保存密码"}
                </Button>
                {requiredChange ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={async () => {
                      try {
                        await logout();
                        router.replace("/admin");
                      } catch {
                        setError("退出失败，请重试");
                      }
                    }}
                  >
                    退出登录
                  </Button>
                ) : null}
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
