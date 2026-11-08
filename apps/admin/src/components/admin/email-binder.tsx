import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { bindEmail } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { profileErrorKey } from "@/lib/profile-errors";

type EmailBinderProps = {
  email?: string | null;

  onUpdated: (email: string) => void;

  embedded?: boolean;
};

export function EmailBinder({ email, onUpdated, embedded = false }: EmailBinderProps) {
  const t = useTranslations("admin.profile");
  const [value, setValue] = useState(email ?? "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(email ?? "");
  }, [email]);

  async function handleSave() {
    const trimmed = value.trim();

    if (!trimmed) {
      toast.error(t("enterEmail"));

      return;
    }

    setSaving(true);

    try {
      const user = await bindEmail(trimmed);

      onUpdated(user.email ?? trimmed);

      toast.success(t("emailSaved"), { description: t("emailSavedDescription") });
    } catch (err) {
      toast.error(t("saveFailed"), {
        description: t(profileErrorKey(err)),
      });
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <FieldGroup className="gap-3">
      {email ? (
        <div className="flex min-h-11 items-center gap-2 rounded-[2px] border border-border/50 bg-muted/25 px-3 py-2.5 text-xs">
          <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />

          <p className="m-0 min-w-0 break-all leading-normal text-muted-foreground">
            {t("currentlyLinked")} <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
      ) : null}

      <Field>
        <FieldLabel htmlFor="profile-email">{email ? t("changeEmail") : t("emailAddress")}</FieldLabel>

        <Input
          id="profile-email"
          type="email"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Field>

      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            {t("saving")}
          </>
        ) : (
          t("saveEmail")
        )}
      </Button>
    </FieldGroup>
  );

  if (embedded) return form;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium">{t("email")}</p>

        <p className="mt-1 text-xs text-muted-foreground">{t("emailHint")}</p>
      </div>

      {form}
    </div>
  );
}
