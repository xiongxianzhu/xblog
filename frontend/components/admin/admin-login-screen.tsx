"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AdminLoginBrand } from "@/components/admin/admin-login-brand";
import { AdminOAuthButtons, AdminOAuthButtonsSkeleton } from "@/components/admin/admin-oauth-buttons";
import { AdminSmsLoginForm } from "@/components/admin/admin-sms-login-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { forgotPassword, getLoginMethods, login, type LoginMethods } from "@/lib/api";
import { cn } from "@/lib/utils";

type View = "login" | "forgot";
type LoginTab = "password" | "sms";

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

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_linked: "该第三方账号尚未绑定管理员，请先用账号密码登录，在个人资料中绑定。",
  oauth_failed: "第三方登录失败，请稍后重试。",
};

export function AdminLoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tFeedback = useTranslations("admin.feedback");
  const [view, setView] = useState<View>("login");
  const [loginTab, setLoginTab] = useState<LoginTab>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<LoginMethods>({ sms: false, github: false, wechat: false });
  const [methodsLoaded, setMethodsLoaded] = useState(false);

  useEffect(() => {
    getLoginMethods()
      .then((value) => {
        setMethods(value);
        setMethodsLoaded(true);
      })
      .catch(() => {
        setMethods({ sms: false, github: false, wechat: false });
        setMethodsLoaded(true);
      });
  }, []);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error && OAUTH_ERROR_MESSAGES[error]) {
      toast.error(tFeedback("loginFailed"), { description: OAUTH_ERROR_MESSAGES[error] });
    }
  }, [searchParams, tFeedback]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      toast.success(tFeedback("loginSuccess"), {
        description: tFeedback("loginSuccessDesc", { username: user.username }),
      });
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(tFeedback("loginFailed"), {
        description: getLoginErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSmsLoginSuccess(signedInUsername: string) {
    toast.success(tFeedback("loginSuccess"), {
      description: tFeedback("loginSuccessDesc", { username: signedInUsername }),
    });
    router.push("/admin/dashboard");
    router.refresh();
  }

  async function handleForgot(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await forgotPassword(username);
      toast.success("请求已提交", { description: result.message });
      setView("login");
    } catch (err) {
      toast.error("提交失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setLoading(false);
    }
  }

  const oauthAvailable = methods.github || methods.wechat;
  const showLoginTabs = methods.sms;

  return (
    <div className="admin-login-screen relative z-10 w-full max-w-[26rem]">
      <AdminLoginBrand />

      <div className="admin-login-panel backdrop-blur-sm">
        <div className="border-b border-border/70 px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">{view === "login" ? "登录" : "找回密码"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {view === "login" ? "使用管理员账号进入控制台" : "输入用户名，若已绑定邮箱将收到重置链接"}
          </p>
        </div>

        {view === "login" ? (
          <>
            {showLoginTabs ? (
              <div className="flex border-b border-border/70 px-6 pt-4">
                <button
                  type="button"
                  className={cn(
                    "mr-6 border-b-2 pb-3 text-sm font-medium transition-colors",
                    loginTab === "password"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setLoginTab("password")}
                >
                  账号密码
                </button>
                <button
                  type="button"
                  className={cn(
                    "border-b-2 pb-3 text-sm font-medium transition-colors",
                    loginTab === "sms"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setLoginTab("sms")}
                >
                  手机验证码
                </button>
              </div>
            ) : null}

            {loginTab === "sms" && methods.sms ? (
              <AdminSmsLoginForm onSuccess={handleSmsLoginSuccess} />
            ) : (
              <form className="px-6 py-6" onSubmit={handleLogin}>
                <FieldGroup className="gap-5">
                  <Field>
                    <FieldLabel htmlFor="username">用户名</FieldLabel>
                    <Input
                      id="username"
                      className="admin-login-input h-11 rounded-[2px] transition-[border-color,box-shadow] duration-200"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      autoFocus
                      required
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="password">密码</FieldLabel>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setView("forgot")}
                      >
                        忘记密码？
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      className="admin-login-input h-11 rounded-[2px] transition-[border-color,box-shadow] duration-200"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </Field>
                  <Button
                    type="submit"
                    className={cn(
                      "admin-login-submit mt-1 h-11 w-full rounded-[2px] font-medium transition-transform duration-150",
                      "active:scale-[0.99]",
                    )}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        登录中…
                      </>
                    ) : (
                      "登录"
                    )}
                  </Button>
                </FieldGroup>

                {oauthAvailable ? (
                  <>
                    <div className="my-6 flex items-center gap-3">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground">或使用</span>
                      <Separator className="flex-1" />
                    </div>
                    {!methodsLoaded ? (
                      <AdminOAuthButtonsSkeleton />
                    ) : (
                      <AdminOAuthButtons providers={methods} />
                    )}
                  </>
                ) : null}
              </form>
            )}
          </>
        ) : (
          <form className="px-6 py-6" onSubmit={handleForgot}>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="forgot-username">用户名</FieldLabel>
                <Input
                  id="forgot-username"
                  className="admin-login-input h-11 rounded-[2px]"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
                <FieldDescription>未配置 SMTP 或未绑定邮箱时，请使用 CLI 重置密码。</FieldDescription>
              </Field>
              <div className="flex flex-col gap-2">
                <Button type="submit" className="h-11 w-full rounded-[2px]" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      提交中…
                    </>
                  ) : (
                    "发送重置邮件"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full rounded-[2px]"
                  onClick={() => setView("login")}
                >
                  <ArrowLeftIcon className="size-4" />
                  返回登录
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/"
          className="admin-login-back inline-flex items-center gap-1 transition-colors duration-150 hover:text-foreground"
        >
          返回站点
        </Link>
      </p>
    </div>
  );
}
