import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { BirthDatePicker } from "@/components/admin/birth-date-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type AdminUserMe, type ProfileGender, updateProfile } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { profileErrorKey } from "@/lib/profile-errors";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS: ProfileGender[] = ["male", "female", "other"];

const GENDER_NONE = "__none__";

type ProfileBasicFormProps = {
  user: AdminUserMe;
  onUpdated: (user: AdminUserMe) => void;
  embedded?: boolean;
};

export function ProfileBasicForm({ user, onUpdated, embedded = false }: ProfileBasicFormProps) {
  const t = useTranslations("admin.profile");
  const tGender = useTranslations("admin.gender");
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [birthDate, setBirthDate] = useState(user.birth_date ?? "");
  const [gender, setGender] = useState<ProfileGender | "">(user.gender ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNickname(user.nickname ?? "");
    setBirthDate(user.birth_date ?? "");
    setGender(user.gender ?? "");
  }, [user.nickname, user.birth_date, user.gender]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile({
        nickname: nickname.trim() || null,
        birth_date: birthDate.trim() || null,
        gender: gender || null,
      });
      onUpdated(updated);
      toast.success(t("saved"));
    } catch (err) {
      toast.error(t("saveFailed"), {
        description: t(profileErrorKey(err)),
      });
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <>
      <FieldGroup className={cn("gap-4", embedded && "md:grid md:grid-cols-2 md:gap-x-5 md:gap-y-4")}>
        <Field className={embedded ? "md:col-span-2" : undefined}>
          <FieldLabel htmlFor="profile-nickname">{t("nickname")}</FieldLabel>
          <Input
            id="profile-nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder={t("nicknameHint")}
            maxLength={50}
            autoComplete="nickname"
            className={cn(adminBorderlessControlClass, adminBorderlessFocusClass)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-birth-date">{t("birthDate")}</FieldLabel>
          <BirthDatePicker id="profile-birth-date" value={birthDate} onChange={setBirthDate} />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-gender">{tGender("label")}</FieldLabel>
          <Select
            value={gender || GENDER_NONE}
            onValueChange={(value) => setGender(value === GENDER_NONE ? "" : (value as ProfileGender))}
          >
            <SelectTrigger
              id="profile-gender"
              className={cn(adminBorderlessControlClass, adminBorderlessFocusClass)}
            >
              <SelectValue placeholder={tGender("select")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENDER_NONE}>{tGender("unset")}</SelectItem>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {tGender(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <div className={embedded ? "mt-5 flex justify-end border-t border-border/50 pt-4" : "mt-4"}>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void handleSave()}>
          {saving ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("saveBasic")
          )}
        </Button>
      </div>
    </>
  );

  if (embedded) return form;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium">{t("basic")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("basicHint")}</p>
      </div>
      {form}
    </div>
  );
}
