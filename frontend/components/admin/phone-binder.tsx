"use client";

import { useEffect, useState } from "react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { bindPhone } from "@/lib/api";

type PhoneBinderProps = {
  phone?: string | null;
  onUpdated: (phone: string) => void;
  embedded?: boolean;
};

export function PhoneBinder({ phone, onUpdated, embedded = false }: PhoneBinderProps) {
  const [value, setValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(phone ?? "");
  }, [phone]);

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

  const form = (
    <FieldGroup className="gap-3">
      {phone ? (
        <div className="flex items-start gap-2 rounded-[2px] border border-border/50 bg-muted/25 px-3 py-2.5 text-xs">
          <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            当前绑定 <span className="font-medium text-foreground">{phone}</span>
          </p>
        </div>
      ) : null}
      <Field>
        <FieldLabel htmlFor="profile-phone">{phone ? "更换手机号" : "手机号"}</FieldLabel>
        <Input
          id="profile-phone"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="11 位中国大陆手机号"
          inputMode="tel"
          autoComplete="tel"
        />
      </Field>
      <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
        {saving ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            保存中…
          </>
        ) : (
          "保存手机号"
        )}
      </Button>
    </FieldGroup>
  );

  if (embedded) return form;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium">手机号登录</p>
        <p className="mt-1 text-xs text-muted-foreground">绑定后可在登录页使用短信验证码；需在设置中开启手机验证码登录。</p>
      </div>
      {form}
    </div>
  );
}
