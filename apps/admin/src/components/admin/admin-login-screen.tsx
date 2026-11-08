import { Tabs as AntTabs } from "antd";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { AdminLoginBrand } from "@/components/admin/admin-login-brand";
import { showAdminLoginSuccessToast } from "@/components/admin/admin-login-success-toast";
import { AdminOAuthButtons, AdminOAuthButtonsSkeleton } from "@/components/admin/admin-oauth-buttons";
import { AdminPasswordSmsForm } from "@/components/admin/admin-password-sms-form";
import { AdminSmsLoginForm } from "@/components/admin/admin-sms-login-form";
import { AdminTurnstile } from "@/components/admin/admin-turnstile";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import {
  ApiError,
  forgotPassword,
  getLoginGuard,
  getLoginMethods,
  type LoginGuard,
  type LoginMethods,
  login,
  type PasswordSmsChallenge,
} from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type View = "login" | "forgot";
type LoginTab = "password" | "sms";

function getLoginErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof TypeError) {
    return t("network");
  }
  if (error instanceof ApiError) {
    const messageMap: Record<string, string> = {
      "Invalid credentials": t("credentials"),
      "Captcha required": t("captcha"),
      "Captcha verification failed": t("captchaFailed"),
      "登录尝试过于频繁，请稍后再试": t("loginLimit"),
      "请求过于频繁，请稍后再试": t("rateLimit"),
    };
    return messageMap[error.message] ?? getAdminErrorMessage(error);
  }
  if (error instanceof Error) {
    return getAdminErrorMessage(error);
  }
  return t("failed");
}

function readCaptchaRequired(error: unknown): boolean {
  if (!(error instanceof ApiError) || typeof error.data !== "object" || error.data === null) {
    return false;
  }
  return Boolean((error.data as { captcha_required?: boolean }).captcha_required);
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_linked: "notLinked",
  oauth_failed: "oauthFailed",
  oauth_already_linked: "alreadyLinked",
};

export function AdminLoginScreen() {
  const t = useTranslations("admin.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tFeedback = useTranslations("admin.feedback");
  const [view, setView] = useState<View>("login");
  const [loginTab, setLoginTab] = useState<LoginTab>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smsChallenge, setSmsChallenge] = useState<PasswordSmsChallenge | null>(null);
  const [methods, setMethods] = useState<LoginMethods>({ sms: false, github: false, wechat: false });
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [loginGuard, setLoginGuard] = useState<LoginGuard | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const siteKey =
    loginGuard?.site_key ??
    (typeof import.meta.env.VITE_TURNSTILE_SITE_KEY === "string"
      ? import.meta.env.VITE_TURNSTILE_SITE_KEY
      : "");
  const captchaEnabled = Boolean(loginGuard?.captcha_enabled && siteKey);
  const loginCaptchaRequired = Boolean(loginGuard?.captcha_required && captchaEnabled);
  const forgotCaptchaRequired = Boolean(view === "forgot" && captchaEnabled);
  const loginSubmitBlocked = loginCaptchaRequired && !turnstileToken;
  const forgotSubmitBlocked = forgotCaptchaRequired && !turnstileToken;

  const refreshLoginGuard = useCallback(async (nextUsername?: string) => {
    try {
      const guard = await getLoginGuard(nextUsername?.trim() || undefined);
      setLoginGuard(guard);
    } catch {
      setLoginGuard(null);
    }
  }, []);

  useEffect(() => {
    void refreshLoginGuard();
  }, [refreshLoginGuard]);

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
      description: t(OAUTH_ERROR_MESSAGES[error]),
    });
    router.replace("/admin");
  }, [searchParams, tFeedback, router, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset the challenge whenever its view or requirement changes.
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
      if ("sms_required" in user) {
        setSmsChallenge(user);
        setPassword("");
        setTurnstileToken(null);
        setTurnstileKey((value) => value + 1);
        return;
      }
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
        description: getLoginErrorMessage(err, t),
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
      toast.success(t("submitted"), { description: getAdminErrorMessage(result.message) });
      setView("login");
      setTurnstileToken(null);
      setTurnstileKey((value) => value + 1);
    } catch (err) {
      setTurnstileToken(null);
      setTurnstileKey((value) => value + 1);
      toast.error(t("submitFailed"), {
        description: getLoginErrorMessage(err, t),
      });
    } finally {
      setLoading(false);
    }
  }

  const oauthAvailable = methods.github || methods.wechat;
  const showLoginTabs = methods.sms;

  return (
    <div className="admin-login-screen relative z-10 w-full max-w-[26rem]">
      <div className="admin-login-panel overflow-hidden">
        <AdminLoginBrand
          centered
          className=" mb-0 h-auto flex-col gap-3 border-b border-border/60 px-6 py-6 text-center sm:px-8 [@media(max-height:820px)]:py-3"
        />
        <div className="px-6 pt-6 text-center sm:px-8 [@media(max-height:820px)]:pt-3">
          <h1 className="m-0 text-2xl font-semibold leading-tight tracking-tight">
            {smsChallenge ? t("passwordSmsTitle") : view === "login" ? t("signIn") : t("forgot")}
          </h1>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-muted-foreground">
            {smsChallenge ? t("passwordSmsIntro") : view === "login" ? t("intro") : t("forgotIntro")}
          </p>
        </div>

        {smsChallenge ? (
          <AdminPasswordSmsForm
            challenge={smsChallenge}
            onSuccess={handleSmsLoginSuccess}
            onBack={() => {
              setSmsChallenge(null);
              void refreshLoginGuard(username);
            }}
          />
        ) : view === "login" ? (
          <>
            {showLoginTabs ? (
              <AntTabs
                className="px-6 pt-3 sm:px-8"
                activeKey={loginTab}
                onChange={(key) => setLoginTab(key as LoginTab)}
                items={[
                  { key: "password", label: t("passwordTab") },
                  { key: "sms", label: t("smsTab") },
                ]}
              />
            ) : null}

            {loginTab === "sms" && methods.sms ? (
              <AdminSmsLoginForm onSuccess={handleSmsLoginSuccess} />
            ) : (
              <form className="px-6 pb-6 pt-5 sm:px-8 sm:pb-8" onSubmit={handleLogin}>
                <FieldGroup className="gap-5 [@media(max-height:820px)]:gap-3">
                  <Field>
                    <FieldLabel htmlFor="username">{t("account")}</FieldLabel>
                    <Input
                      id="username"
                      className="admin-login-input h-11 rounded-[2px] transition-[border-color,box-shadow] duration-200"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      autoFocus
                      placeholder={t("accountHint")}
                      required
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setView("forgot")}
                      >
                        {t("forgotLink")}
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
                        placeholder={t("passwordHint")}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 w-10 rounded-[2px] px-0 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? t("hide") : t("show")}
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
                        {t("signingIn")}
                      </>
                    ) : (
                      t("signIn")
                    )}
                  </Button>
                </FieldGroup>

                {oauthAvailable ? (
                  <>
                    <div className="my-4 flex items-center gap-3">
                      <span aria-hidden className="h-px flex-1 bg-border/60" />
                      <span className="shrink-0 text-xs text-muted-foreground">{t("or")}</span>
                      <span aria-hidden className="h-px flex-1 bg-border/60" />
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
          <form className="px-6 pb-6 pt-5 sm:px-8 sm:pb-8" onSubmit={handleForgot}>
            <FieldGroup className="gap-5 [@media(max-height:820px)]:gap-3">
              <Field>
                <FieldLabel htmlFor="forgot-username">{t("username")}</FieldLabel>
                <Input
                  id="forgot-username"
                  className="admin-login-input h-11 rounded-[2px]"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
                <FieldDescription>{t("smtpHint")}</FieldDescription>
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
                <Button
                  type="submit"
                  className="h-11 w-full rounded-[2px]"
                  disabled={loading || forgotSubmitBlocked}
                >
                  {loading ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    t("sendReset")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full rounded-[2px]"
                  onClick={() => setView("login")}
                >
                  <ArrowLeftIcon className="size-4" />
                  {t("backLogin")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </div>
    </div>
  );
}
