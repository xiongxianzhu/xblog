"use client";

import { Loader2Icon } from "lucide-react";
import { SiGithub, SiWechat } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { oauthBindUrl, oauthLoginUrl, type OAuthProviders } from "@/lib/api";

type Props = {
  providers: OAuthProviders;
  mode?: "login" | "bind";
  links?: OAuthProviders;
  className?: string;
};

export function AdminOAuthButtons({ providers, mode = "login", links, className }: Props) {
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
          <SiGithub className="size-4" aria-hidden />
          {mode === "bind" ? (links?.github ? "GitHub 已绑定" : "绑定 GitHub") : "使用 GitHub 登录"}
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
          {mode === "bind" ? (links?.wechat ? "微信已绑定" : "绑定微信") : "使用微信登录"}
        </Button>
      ) : null}
    </div>
  );
}

export function AdminOAuthButtonsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" className="h-11 w-full rounded-[2px]" disabled>
        <Loader2Icon className="size-4 animate-spin" />
        加载登录方式…
      </Button>
    </div>
  );
}
