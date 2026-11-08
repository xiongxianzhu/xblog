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
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { changePassword, logout } from "@/lib/api";
import { useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

const adminFieldClass = cn(adminBorderlessControlClass, adminBorderlessFocusClass);
export default function AdminPasswordPage({ requiredChange = false }: { requiredChange?: boolean }) {
  const txt = useAdminMessages();
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
      setError(txt("m0150"));
      return;
    }
    if (!requiredChange && newPassword === currentPassword) {
      setError(txt("m0151"));
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setError(txt("m0152"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(txt("m0153"));
      return;
    }
    setLoading(true);
    try {
      await changePassword(requiredChange ? undefined : currentPassword, newPassword);
      setSuccess(txt("m0154"));
      await Promise.all([mutate("auth-me"), mutate("admin-me")]);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.replace(requiredChange ? "/admin/dashboard" : "/admin/profile");
    } catch (err) {
      const message = getAdminErrorMessage(err);
      setError(message === "Current password is incorrect" ? txt("m0156") : message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <AdminPageHeader
        title={requiredChange ? txt("m0011") : txt("m0157")}
        description={requiredChange ? txt("m0158") : txt("m0159")}
      />

      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {!requiredChange ? (
                <Field>
                  <FieldLabel htmlFor="current-password">{txt("m0160")}</FieldLabel>
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
                <FieldLabel htmlFor="new-password">{txt("m0013")}</FieldLabel>
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
                <FieldLabel htmlFor="confirm-password">{txt("m0014")}</FieldLabel>
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
                  {loading ? txt("m0015") : txt("m0161")}
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
                        setError(txt("m0162"));
                      }
                    }}
                  >
                    {txt("m0163")}
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
