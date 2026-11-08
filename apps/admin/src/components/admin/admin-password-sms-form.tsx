import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { type PasswordSmsChallenge, verifyPasswordSms } from "@/lib/api";
import { toast } from "@/lib/feedback";

export function AdminPasswordSmsForm({
  challenge,
  onSuccess,
  onBack,
}: {
  challenge: PasswordSmsChallenge;
  onSuccess: (username: string) => void;
  onBack: () => void;
}) {
  const t = useTranslations("admin.login");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setExpired(true), challenge.expires_in * 1000);
    return () => window.clearTimeout(timer);
  }, [challenge.expires_in]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || expired || code.length !== 6) return;
    setLoading(true);
    try {
      const user = await verifyPasswordSms(challenge.challenge_token, code);
      onSuccess(user.username);
    } catch (error) {
      toast.error(t("failed"), { description: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="px-6 py-6 sm:px-8" onSubmit={submit}>
      <FieldGroup className="gap-5">
        <p className="text-sm text-muted-foreground" role="status">
          {expired ? t("passwordSmsExpired") : t("passwordSmsSent", { phone: challenge.masked_phone })}
        </p>
        <Field>
          <FieldLabel htmlFor="password-sms-code">{t("code")}</FieldLabel>
          <Input
            id="password-sms-code"
            className="admin-login-input h-11 rounded-[2px]"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            minLength={6}
            maxLength={6}
            required
            disabled={expired}
          />
          {challenge.delivery === "dev" ? <FieldDescription>{t("devCode")}</FieldDescription> : null}
        </Field>
        <Button type="submit" className="h-11 w-full" disabled={loading || expired || code.length !== 6}>
          {loading ? t("signingIn") : t("passwordSmsVerify")}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          {t("passwordSmsRestart")}
        </Button>
      </FieldGroup>
    </form>
  );
}
