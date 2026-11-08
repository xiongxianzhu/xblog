import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { loginWithSms, sendSmsLoginCode } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { cn } from "@/lib/utils";

type Props = {
  onSuccess: (username: string) => void;
  className?: string;
};

export function AdminSmsLoginForm({ onSuccess, className }: Props) {
  const t = useTranslations("admin.login");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  async function handleSendCode() {
    if (!phone.trim() || sending || countdown > 0) return;
    setSending(true);
    try {
      const result = await sendSmsLoginCode(phone.trim());
      toast.success(t("codeSent"), { description: getAdminErrorMessage(result.message) });
      setCountdown(60);
    } catch (err) {
      toast.error(t("sendFailed"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoggingIn(true);
    try {
      const user = await loginWithSms(phone.trim(), code.trim());
      onSuccess(user.username);
    } catch (err) {
      toast.error(t("failed"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <form className={cn("px-6 py-6", className)} onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="login-phone">{t("phone")}</FieldLabel>
          <Input
            id="login-phone"
            className="admin-login-input h-11 rounded-[2px]"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder={t("phoneHint")}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-code">{t("code")}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="login-code"
              className="admin-login-input h-11 flex-1 rounded-[2px]"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("codeHint")}
              minLength={6}
              maxLength={6}
              required
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-[2px] px-4"
              disabled={sending || countdown > 0 || !phone.trim()}
              onClick={() => void handleSendCode()}
            >
              {sending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : countdown > 0 ? (
                `${countdown}s`
              ) : (
                t("getCode")
              )}
            </Button>
          </div>
          <FieldDescription>{t("devCode")}</FieldDescription>
        </Field>
        <Button type="submit" className="h-11 w-full rounded-[2px] active:scale-[0.99]" disabled={loggingIn}>
          {loggingIn ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {t("signingIn")}
            </>
          ) : (
            t("signIn")
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
