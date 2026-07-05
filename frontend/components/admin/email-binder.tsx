"use client";

import { useEffect, useState } from "react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { bindEmail } from "@/lib/api";

type EmailBinderProps = {
  email?: string | null;
  onUpdated: (email: string) => void;
  embedded?: boolean;
};

export function EmailBinder({ email, onUpdated, embedded = false }: EmailBinderProps) {
  const [value, setValue] = useState(email ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(email ?? "");
  }, [email]);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("请输入邮箱");
      return;
    }
    setSaving(true);
    try {
      const user = await bindEmail(trimmed);
      onUpdated(user.email ?? trimmed);
      toast.success("邮箱已保存", { description: "可用于密码登录与找回密码。" });
    } catch (err) {
      toast.error("保存失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <FieldGroup className="gap-3">
      {email ? (
        <div className="flex items-start gap-2 rounded-[2px] border border-border/50 bg-muted/25 px-3 py-2.5 text-xs">
          <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p className="min-w-0 text-muted-foreground">
            当前绑定 <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
      ) : null}
      <Field>
        <FieldLabel htmlFor="profile-email">{email ? "更换邮箱" : "邮箱地址"}</FieldLabel>
        <Input
          id="profile-email"
          type="email"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Field>
      <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
        {saving ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            保存中…
          </>
        ) : (
          "保存邮箱"
        )}
      </Button>
    </FieldGroup>
  );

  if (embedded) return form;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium">邮箱</p>
        <p className="mt-1 text-xs text-muted-foreground">
          绑定后可使用邮箱 + 密码登录；找回密码邮件将发送到此地址（需配置 SMTP）。
        </p>
      </div>
      {form}
    </div>
  );
}
