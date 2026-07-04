"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/api";

export default function AdminPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("新密码至少 8 个字符");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess("密码已更新，请使用新密码登录");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => router.push("/admin/profile"), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "修改失败";
      setError(message === "Current password is incorrect" ? "当前密码不正确" : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="修改密码" description="更新管理员登录密码。" />

      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="current-password">当前密码</FieldLabel>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-password">新密码</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </Field>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="confirm-password">确认新密码</FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
                {error ? <FieldError>{error}</FieldError> : null}
                {success ? <p className="text-sm text-primary">{success}</p> : null}
              </Field>
              <Button type="submit" disabled={loading}>
                {loading ? "保存中…" : "保存密码"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
