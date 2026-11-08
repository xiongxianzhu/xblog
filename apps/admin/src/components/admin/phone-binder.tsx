import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { bindPhone } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { profileErrorKey } from "@/lib/profile-errors";

type PhoneBinderProps = {
  phone?: string | null;
  onUpdated: (phone: string) => void;
  embedded?: boolean;
};

export function PhoneBinder({ phone, onUpdated, embedded = false }: PhoneBinderProps) {
  const t = useTranslations("admin.profile");
  const [value, setValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(phone ?? "");
  }, [phone]);

  async function handleSave() {
    if (!value.trim()) {
      toast.error(t("enterPhone"));
      return;
    }
    setSaving(true);
    try {
      const user = await bindPhone(value.trim());
      onUpdated(user.phone ?? value.trim());
      toast.success(t("phoneSaved"), { description: t("phoneSavedDescription") });
    } catch (err) {
      toast.error(t("linkFailed"), {
        description: t(profileErrorKey(err)),
      });
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <FieldGroup className="gap-3">
      {phone ? (
        <div className="flex min-h-11 items-center gap-2 rounded-[2px] border border-border/50 bg-muted/25 px-3 py-2.5 text-xs">
          <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />
          <p className="m-0 min-w-0 break-all leading-normal text-muted-foreground">
            {t("currentlyLinked")} <span className="font-medium text-foreground">{phone}</span>
          </p>
        </div>
      ) : null}
      <Field>
        <FieldLabel htmlFor="profile-phone">{phone ? t("changePhone") : t("phone")}</FieldLabel>
        <Input
          id="profile-phone"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("phoneHint")}
          inputMode="tel"
          autoComplete="tel"
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
          t("savePhone")
        )}
      </Button>
    </FieldGroup>
  );

  if (embedded) return form;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium">{t("phoneLogin")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("phoneDescription")}</p>
      </div>
      {form}
    </div>
  );
}
