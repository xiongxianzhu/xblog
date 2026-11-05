import { Loader2Icon, MessageCircle as SiWechat } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/ui/button";
import { type OAuthProviders, oauthBindUrl, oauthLoginUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  providers: OAuthProviders;
  mode?: "login" | "bind";
  links?: OAuthProviders;
  className?: string;
};

export function AdminOAuthButtons({ providers, mode = "login", links, className }: Props) {
  const t = useTranslations("admin.login");
  const showGithub = providers.github && (mode === "login" || providers.github);
  const showWechat = providers.wechat && (mode === "login" || providers.wechat);
  if (!showGithub && !showWechat) return null;

  function startOAuth(provider: "github" | "wechat") {
    const url = mode === "bind" ? oauthBindUrl(provider) : oauthLoginUrl(provider);
    window.location.href = url;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showGithub ? (
        <Button
          type="button"
          variant="outline"
          className="admin-oauth-btn h-11 w-full rounded-[2px] bg-background/80"
          onClick={() => startOAuth("github")}
          disabled={mode === "bind" && links?.github}
        >
          <svg className="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.45 7.45 0 0 1 8 3.88c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          {mode === "bind" ? (links?.github ? t("githubBound") : t("githubBind")) : t("githubLogin")}
        </Button>
      ) : null}
      {showWechat ? (
        <Button
          type="button"
          variant="outline"
          className="admin-oauth-btn admin-oauth-btn-wechat h-11 w-full rounded-[2px] bg-background/80"
          onClick={() => startOAuth("wechat")}
          disabled={mode === "bind" && links?.wechat}
        >
          <SiWechat className="size-4 text-[#07C160]" aria-hidden />
          {mode === "bind" ? (links?.wechat ? t("wechatBound") : t("wechatBind")) : t("wechatLogin")}
        </Button>
      ) : null}
    </div>
  );
}

export function AdminOAuthButtonsSkeleton() {
  const t = useTranslations("admin.login");
  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" className="h-11 w-full rounded-[2px]" disabled>
        <Loader2Icon className="size-4 animate-spin" />
        {t("loading")}
      </Button>
    </div>
  );
}
