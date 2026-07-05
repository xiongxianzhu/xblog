"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AdminLoginBrand } from "@/components/admin/admin-login-brand";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/api";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      toast.error("链接无效", { description: "缺少重置令牌，请重新申请找回密码。" });
      return;
    }
    if (password.length < 8) {
      toast.error("密码太短", { description: "新密码至少需要 8 位。" });
      return;
    }
    if (password !== confirmPassword) {
      toast.error("两次密码不一致");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success("密码已重置", { description: "请使用新密码登录。" });
      router.replace("/admin");
    } catch (err) {
      toast.error("重置失败", {
        description: err instanceof Error ? err.message : "链接可能已过期，请重新申请。",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-screen relative z-10 w-full max-w-[26rem]">
      <AdminLoginBrand subtitle="重置密码" />

      <div className="admin-login-panel">
        <div className="border-b border-border/70 px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">设置新密码</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">请输入新的管理员密码</p>
        </div>
        <form className="px-6 py-6" onSubmit={handleSubmit}>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="new-password">新密码</FieldLabel>
              <Input
                id="new-password"
                type="password"
                className="admin-login-input h-11 rounded-[2px]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">确认新密码</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                className="admin-login-input h-11 rounded-[2px]"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>
            <Button
              type="submit"
              className={cn("h-11 w-full rounded-[2px] active:scale-[0.99]")}
              disabled={loading || !token}
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  保存中…
                </>
              ) : (
                "保存新密码"
              )}
            </Button>
            <Button type="button" variant="ghost" className="h-10 w-full rounded-[2px]" asChild>
              <Link href="/admin">
                <ArrowLeftIcon className="size-4" />
                返回登录
              </Link>
            </Button>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
