"use client";

import { useInsertionEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import type { SitePublicColorMode } from "@/lib/themes";
import { renderMermaidDiagrams } from "@/lib/mermaid-diagram";
import { enhanceProseCodeBlocks } from "@/lib/prose-code-blocks";
import { enhanceProseTables } from "@/lib/prose-tables";
import { cn } from "@/lib/utils";

/** 公开页渲染后端 content_html 时的 prose 样式（与后台预览对齐）。 */
export const proseHtmlClassName = cn(
  "prose prose-lg max-w-none prose-headings:font-serif prose-a:text-primary",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-img:inline prose-img:max-w-full prose-img:align-middle",
  "[&_p[align=center]]:text-center",
);

type ProseHtmlProps = {
  html: string;
  className?: string;
  /** 与公开站主题 mode 对齐，Mermaid 深浅色主题一致 */
  colorMode?: SitePublicColorMode;
};

type CopyLabels = {
  copy: string;
  copied: string;
  copyCodeAria: string;
};

function resolveColorMode(root: HTMLElement, colorMode?: SitePublicColorMode): SitePublicColorMode {
  if (colorMode) return colorMode;
  const shell = root.closest("[data-site-shell], [data-admin-shell]");
  return shell?.classList.contains("dark") ? "dark" : "light";
}

export function ProseHtml({ html, className, colorMode }: ProseHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("common");
  const labels: CopyLabels = {
    copy: t("copy"),
    copied: t("copied"),
    copyCodeAria: t("copyCodeAria"),
  };
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

  const enhanceCleanupRef = useRef<(() => void) | undefined>();
  const mermaidCleanupRef = useRef<(() => void) | undefined>();

  useInsertionEffect(() => {
    return () => {
      enhanceCleanupRef.current?.();
      enhanceCleanupRef.current = undefined;
      mermaidCleanupRef.current?.();
      mermaidCleanupRef.current = undefined;
    };
  }, [html, colorMode]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    let disposed = false;
    const mode = resolveColorMode(root, colorMode);

    const removeTableEnhance = enhanceProseTables(root);
    const removeCodeEnhance = enhanceProseCodeBlocks(root, labels);
    enhanceCleanupRef.current = () => {
      removeTableEnhance();
      removeCodeEnhance();
    };

    void (async () => {
      try {
        const cleanup = await renderMermaidDiagrams(root, mode, mermaidLabels);
        if (disposed) {
          cleanup();
          return;
        }
        mermaidCleanupRef.current = cleanup;
      } catch {
        // 单条语法错误时不阻断正文渲染
      }
    })();

    return () => {
      disposed = true;
    };
  }, [
    html,
    colorMode,
    labels.copy,
    labels.copied,
    labels.copyCodeAria,
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

  return (
    <div
      ref={ref}
      className={cn(proseHtmlClassName, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
