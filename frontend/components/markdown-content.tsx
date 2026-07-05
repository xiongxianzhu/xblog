"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { renderMermaidDiagrams } from "@/lib/mermaid-diagram";
import { enhanceProseTables } from "@/lib/prose-tables";
import type { SitePublicColorMode } from "@/lib/themes";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content: string;
  className?: string;
  emptyHint?: string;
  /** 与所在 shell 主题 mode 对齐，Mermaid 深浅色一致 */
  colorMode?: SitePublicColorMode;
};

function resolveColorMode(root: HTMLElement, colorMode?: SitePublicColorMode): SitePublicColorMode {
  if (colorMode) return colorMode;
  const shell = root.closest("[data-site-shell], [data-admin-shell]");
  return shell?.classList.contains("dark") ? "dark" : "light";
}

/** 与后端 Python markdown「extra」扩展一致：支持 GFM + 内联 HTML。 */
export function MarkdownContent({ content, className, emptyHint, colorMode }: MarkdownContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("common");
  const mermaidLabels = {
    zoomIn: t("mermaidZoomIn"),
    zoomOut: t("mermaidZoomOut"),
    reset: t("mermaidReset"),
    fullscreen: t("mermaidFullscreen"),
    close: t("mermaidClose"),
    copy: t("copy"),
    copied: t("copied"),
    copySource: t("mermaidCopySource"),
    panUp: t("mermaidPanUp"),
    panDown: t("mermaidPanDown"),
    panLeft: t("mermaidPanLeft"),
    panRight: t("mermaidPanRight"),
  };

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let disposed = false;
    let removeTableEnhance: (() => void) | undefined;
    let removeMermaid: (() => void) | undefined;

    const mode = resolveColorMode(root, colorMode);

    void (async () => {
      removeTableEnhance = enhanceProseTables(root);
      if (!disposed) {
        try {
          removeMermaid = await renderMermaidDiagrams(root, mode, mermaidLabels);
        } catch {
          // 单条语法错误时不阻断预览渲染
        }
      }
    })();

    return () => {
      disposed = true;
      removeTableEnhance?.();
      removeMermaid?.();
    };
  }, [
    content,
    colorMode,
    mermaidLabels.zoomIn,
    mermaidLabels.zoomOut,
    mermaidLabels.reset,
    mermaidLabels.fullscreen,
    mermaidLabels.close,
    mermaidLabels.copy,
    mermaidLabels.copied,
    mermaidLabels.copySource,
    mermaidLabels.panUp,
    mermaidLabels.panDown,
    mermaidLabels.panLeft,
    mermaidLabels.panRight,
  ]);

  if (!content.trim()) {
    return emptyHint ? <p className="text-sm text-muted-foreground">{emptyHint}</p> : null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-a:text-primary",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-img:inline prose-img:max-w-full prose-img:align-middle",
        "[&_p[align=center]]:text-center",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
