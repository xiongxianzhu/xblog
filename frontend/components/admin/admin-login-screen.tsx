"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AdminLoginBrand } from "@/components/admin/admin-login-brand";
import { showAdminLoginSuccessToast } from "@/components/admin/admin-login-success-toast";
import { AdminOAuthButtons, AdminOAuthButtonsSkeleton } from "@/components/admin/admin-oauth-buttons";
import { AdminSmsLoginForm } from "@/components/admin/admin-sms-login-form";
import { AdminTurnstile } from "@/components/admin/admin-turnstile";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ApiError,
  forgotPassword,
  getLoginGuard,
  getLoginMethods,
  login,
  type LoginGuard,
  type LoginMethods,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type View = "login" | "forgot";
type LoginTab = "password" | "sms";

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "无法连接后端，请确认 backend 已启动（uvicorn :8000）且 frontend 已重启";
  }
  if (error instanceof ApiError) {
    const messageMap: Record<string, string> = {
      "Invalid credentials": "账号或密码错误",
      "Captcha required": "请完成人机验证",
      "Captcha verification failed": "人机验证失败，请重试",
      "登录尝试过于频繁，请稍后再试": "登录尝试过于频繁，请稍后再试",
      "请求过于频繁，请稍后再试": "请求过于频繁，请稍后再试",
    };
    return (messageMap[error.message] ?? error.message) || "登录失败";
  }
  if (error instanceof Error) {
    return error.message || "登录失败";
  }
  return "登录失败";
}

function readCaptchaRequired(error: unknown): boolean {
  if (!(error instanceof ApiError) || typeof error.data !== "object" || error.data === null) {
    return false;
  }
  return Boolean((error.data as { captcha_required?: boolean }).captcha_required);
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_linked: "该第三方账号尚未绑定管理员，请先用账号密码登录，在个人资料中绑定。",
  oauth_failed: "第三方登录失败，请稍后重试。",
  oauth_already_linked: "该 GitHub / 微信账号已绑定其他管理员。",
};

export function AdminLoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tFeedback = useTranslations("admin.feedback");
  const [view, setView] = useState<View>("login");
  const [loginTab, setLoginTab] = useState<LoginTab>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<LoginMethods>({ sms: false, github: false, wechat: false });
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [loginGuard, setLoginGuard] = useState<LoginGuard | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const siteKey =
    loginGuard?.site_key ??
    (typeof process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === "string"
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      : "");
  const captchaEnabled = Boolean(loginGuard?.captcha_enabled && siteKey);
  const loginCaptchaRequired = Boolean(loginGuard?.captcha_required && captchaEnabled);
  const forgotCaptchaRequired = Boolean(view === "forgot" && captchaEnabled);
  const loginSubmitBlocked = loginCaptchaRequired && !turnstileToken;
  const forgotSubmitBlocked = forgotCaptchaRequired && !turnstileToken;

  async function refreshLoginGuard(nextUsername?: string) {
    try {
      const guard = await getLoginGuard(nextUsername?.trim() || undefined);
      setLoginGuard(guard);
    } catch {
      setLoginGuard(null);
    }
  }

  useEffect(() => {
    void refreshLoginGuard();
  }, []);

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
    if (!error || !OAUTH_ERROR_MESSAGES[error]) return;

    toast.error(tFeedback("loginFailed"), {
      id: `admin-oauth-error-${error}`,
      description: OAUTH_ERROR_MESSAGES[error],
    });
    router.replace("/admin");
  }, [searchParams, tFeedback, router]);

  useEffect(() => {
    setTurnstileToken(null);
    setTurnstileKey((value) => value + 1);
  }, [view, loginCaptchaRequired, forgotCaptchaRequired]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (loginSubmitBlocked) return;
    setLoading(true);
    try {
      const user = await login(username, password, turnstileToken ?? undefined);
      showAdminLoginSuccessToast(tFeedback, user.username);
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      if (readCaptchaRequired(err)) {
        await refreshLoginGuard(username);
      } else if (err instanceof ApiError && err.status === 401) {
        await refreshLoginGuard(username);
      }
      setTurnstileToken(null);
      setTurnstileKey((value) => value + 1);
      toast.error(tFeedback("loginFailed"), {
        description: getLoginErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSmsLoginSuccess(signedInUsername: string) {
    showAdminLoginSuccessToast(tFeedback, signedInUsername);
    router.push("/admin/dashboard");
    router.refresh();
  }

  async function handleForgot(event: React.FormEvent) {
    event.preventDefault();
    if (forgotSubmitBlocked) return;
    setLoading(true);
    try {
      const result = await forgotPassword(username, turnstileToken ?? undefined);
      toast.success("请求已提交", { description: result.message });
      setView("login");
      setTurnstileToken(null);
      setTurnstileKey((value) => value + 1);
    } catch (err) {
      setTurnstileToken(null);
      setTurnstileKey((value) => value + 1);
      toast.error("提交失败", {
        description: getLoginErrorMessage(err),
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
                    <FieldLabel htmlFor="username">账号</FieldLabel>
                    <Input
                      id="username"
                      className="admin-login-input h-11 rounded-[2px] transition-[border-color,box-shadow] duration-200"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      autoFocus
                      placeholder="用户名、手机号或邮箱"
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="admin-login-input h-11 rounded-[2px] pr-10 transition-[border-color,box-shadow] duration-200"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 w-10 rounded-[2px] px-0 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </Button>
                    </div>
                  </Field>
                  {loginCaptchaRequired && siteKey ? (
                    <AdminTurnstile
                      key={`login-${turnstileKey}`}
                      siteKey={siteKey}
                      onSuccess={setTurnstileToken}
                      onExpire={() => setTurnstileToken(null)}
                      onError={() => setTurnstileToken(null)}
                    />
                  ) : null}
                  <Button
                    type="submit"
                    className={cn(
                      "admin-login-submit mt-1 h-11 w-full rounded-[2px] font-medium transition-transform duration-150",
                      "active:scale-[0.99]",
                    )}
                    disabled={loading || loginSubmitBlocked}
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
              {forgotCaptchaRequired && siteKey ? (
                <AdminTurnstile
                  key={`forgot-${turnstileKey}`}
                  siteKey={siteKey}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              ) : null}
              <div className="flex flex-col gap-2">
                <Button type="submit" className="h-11 w-full rounded-[2px]" disabled={loading || forgotSubmitBlocked}>
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
