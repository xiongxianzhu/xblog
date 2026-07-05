"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { BirthDatePicker } from "@/components/admin/birth-date-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfile, type AdminUserMe, type ProfileGender } from "@/lib/api";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS: { value: ProfileGender; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
];

const GENDER_NONE = "__none__";

type ProfileBasicFormProps = {
  user: AdminUserMe;
  onUpdated: (user: AdminUserMe) => void;
  embedded?: boolean;
};

export function ProfileBasicForm({ user, onUpdated, embedded = false }: ProfileBasicFormProps) {
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
      toast.success("资料已保存");
    } catch (err) {
      toast.error("保存失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <>
      <FieldGroup className={cn("gap-4", embedded && "md:grid md:grid-cols-2 md:gap-x-5 md:gap-y-4")}>
        <Field className={embedded ? "md:col-span-2" : undefined}>
          <FieldLabel htmlFor="profile-nickname">昵称</FieldLabel>
          <Input
            id="profile-nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="展示用昵称，可留空"
            maxLength={50}
            autoComplete="nickname"
            className={cn(adminBorderlessControlClass, adminBorderlessFocusClass)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-birth-date">出生日期</FieldLabel>
          <BirthDatePicker id="profile-birth-date" value={birthDate} onChange={setBirthDate} />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-gender">性别</FieldLabel>
          <Select
            value={gender || GENDER_NONE}
            onValueChange={(value) => setGender(value === GENDER_NONE ? "" : (value as ProfileGender))}
          >
            <SelectTrigger id="profile-gender" className={cn(adminBorderlessControlClass, adminBorderlessFocusClass)}>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENDER_NONE}>未设置</SelectItem>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
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
              保存中…
            </>
          ) : (
            "保存基本信息"
          )}
        </Button>
      </div>
    </>
  );

  if (embedded) return form;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium">基本信息</p>
        <p className="mt-1 text-xs text-muted-foreground">昵称、出生日期与性别将显示在用户列表中。</p>
      </div>
      {form}
    </div>
  );
}
