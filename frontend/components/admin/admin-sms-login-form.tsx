"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginWithSms, sendSmsLoginCode } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  onSuccess: (username: string) => void;
  className?: string;
};

export function AdminSmsLoginForm({ onSuccess, className }: Props) {
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
      toast.success("验证码已发送", { description: result.message });
      setCountdown(60);
    } catch (err) {
      toast.error("发送失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
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
      toast.error("登录失败", {
        description: err instanceof Error ? err.message : "验证码错误或已过期",
      });
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <form className={cn("px-6 py-6", className)} onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="login-phone">手机号</FieldLabel>
          <Input
            id="login-phone"
            className="admin-login-input h-11 rounded-[2px]"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="11 位中国大陆手机号"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-code">验证码</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="login-code"
              className="admin-login-input h-11 flex-1 rounded-[2px]"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6 位验证码"
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
              {sending ? <Loader2Icon className="size-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : "获取验证码"}
            </Button>
          </div>
          <FieldDescription>开发环境验证码会输出到 backend 控制台日志。</FieldDescription>
        </Field>
        <Button type="submit" className="h-11 w-full rounded-[2px] active:scale-[0.99]" disabled={loggingIn}>
          {loggingIn ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              登录中…
            </>
          ) : (
            "登录"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
