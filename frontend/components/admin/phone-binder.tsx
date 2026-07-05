"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { bindPhone } from "@/lib/api";

type PhoneBinderProps = {
  phone?: string | null;
  onUpdated: (phone: string) => void;
};

export function PhoneBinder({ phone, onUpdated }: PhoneBinderProps) {
  const [value, setValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) {
      toast.error("请输入手机号");
      return;
    }
    setSaving(true);
    try {
      const user = await bindPhone(value.trim());
      onUpdated(user.phone ?? value.trim());
      toast.success("手机号已绑定", { description: "可在登录页使用手机验证码登录。" });
    } catch (err) {
      toast.error("绑定失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium">手机号登录</p>
        <p className="mt-1 text-xs text-muted-foreground">绑定后可在登录页使用短信验证码；需在设置中开启手机验证码登录。</p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="profile-phone">手机号</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="profile-phone"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="11 位中国大陆手机号"
              inputMode="tel"
              autoComplete="tel"
            />
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  保存中…
                </>
              ) : (
                "保存手机号"
              )}
            </Button>
          </div>
          {phone ? <FieldDescription>当前已绑定：{phone}</FieldDescription> : null}
        </Field>
      </FieldGroup>
    </div>
  );
}
