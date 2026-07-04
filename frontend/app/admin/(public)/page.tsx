"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "无法连接后端，请确认 backend 已启动（uvicorn :8000）且 frontend 已重启";
  }
  if (error instanceof Error) {
    if (error.message === "Invalid credentials") {
      return "用户名或密码错误";
    }
    return error.message || "登录失败";
  }
  return "登录失败";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80">
      <CardHeader className="flex flex-col gap-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <LockIcon className="size-5 text-primary" />
        </div>
        <CardTitle>管理员登录</CardTitle>
        <CardDescription>登录后可管理文章与站点内容</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="username">用户名</FieldLabel>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                required
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登录中…" : "登录"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
