"use client";

import { useEffect, useMemo, useRef } from "react";

import type { SitePublicColorMode } from "@/lib/themes";

type GiscusCommentsProps = {
  /** 与公开站主题 mode 对齐，评论框深浅色一致 */
  theme?: SitePublicColorMode;
};

const GISCUS_REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const GISCUS_REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const GISCUS_CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? "General";
const GISCUS_CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
const GISCUS_MAPPING = process.env.NEXT_PUBLIC_GISCUS_MAPPING ?? "pathname";
const GISCUS_INPUT_POSITION = process.env.NEXT_PUBLIC_GISCUS_INPUT_POSITION ?? "bottom";
const GISCUS_THEME_OVERRIDE = process.env.NEXT_PUBLIC_GISCUS_THEME;

function isGiscusConfigured(): boolean {
  return Boolean(GISCUS_REPO && GISCUS_REPO_ID && GISCUS_CATEGORY_ID);
}

export function GiscusComments({ theme = "light" }: GiscusCommentsProps) {
  const giscusRef = useRef<HTMLDivElement>(null);
  const giscusTheme = useMemo(
    () => GISCUS_THEME_OVERRIDE ?? (theme === "dark" ? "dark" : "light"),
    [theme],
  );

  useEffect(() => {
    if (!isGiscusConfigured() || !giscusRef.current) {
      return;
    }

    const giscusHost = giscusRef.current;
    giscusHost.innerHTML = "";

    const wrapIframe = () => {
      const iframe = giscusHost.querySelector(":scope > iframe.giscus-frame");
      if (!iframe || iframe.parentElement !== giscusHost) {
        return;
      }

      const wrapper = document.createElement("div");
      giscusHost.insertBefore(wrapper, iframe);
      wrapper.appendChild(iframe);
    };

    const observer = new MutationObserver(wrapIframe);
    observer.observe(giscusHost, { childList: true });

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", GISCUS_REPO!);
    script.setAttribute("data-repo-id", GISCUS_REPO_ID!);
    script.setAttribute("data-category", GISCUS_CATEGORY);
    script.setAttribute("data-category-id", GISCUS_CATEGORY_ID!);
    script.setAttribute("data-mapping", GISCUS_MAPPING);
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", GISCUS_INPUT_POSITION);
    script.setAttribute("data-theme", giscusTheme);
    script.setAttribute("data-lang", "zh-CN");

    giscusHost.appendChild(script);

    return () => {
      observer.disconnect();
      giscusHost.innerHTML = "";
    };
  }, [giscusTheme]);

  if (!isGiscusConfigured()) {
    return (
      <p className="rounded-md border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        评论尚未启用。在 <code className="text-foreground">frontend/.env</code> 配置 Giscus 环境变量后重启开发服务器。
        <br />
        <span className="mt-2 inline-block text-xs">
          配置指南见{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://giscus.app/zh-CN"
            rel="noopener noreferrer"
            target="_blank"
          >
            giscus.app
          </a>
        </span>
      </p>
    );
  }

  return <div ref={giscusRef} className="giscus min-h-[120px]" />;
}
