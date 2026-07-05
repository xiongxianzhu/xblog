"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import type { SitePublicColorMode } from "@/lib/themes";
import { extractCodeLanguage, MERMAID_LANG, renderMermaidDiagrams } from "@/lib/mermaid-diagram";
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

function enhanceCodeBlocks(root: HTMLElement, labels: CopyLabels) {
  const shells: HTMLDivElement[] = [];

  root.querySelectorAll("pre").forEach((pre) => {
    const block = pre.closest(".highlight") ?? pre;
    if (block.parentElement?.classList.contains("code-block-shell")) return;

    const lang = extractCodeLanguage(pre, block);
    if (lang === MERMAID_LANG) return;

    const shell = document.createElement("div");
    shell.className = "code-block-shell";
    block.parentNode?.insertBefore(shell, block);

    const toolbar = document.createElement("div");
    toolbar.className = "code-block-toolbar";

    if (lang) {
      const label = document.createElement("span");
      label.className = "code-lang-label";
      label.textContent = lang;
      toolbar.appendChild(label);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy-btn";
    btn.textContent = labels.copy;
    btn.setAttribute("aria-label", labels.copyCodeAria);

    btn.addEventListener("click", () => {
      const text = (pre.querySelector("code") ?? pre).textContent ?? "";
      void navigator.clipboard.writeText(text).then(() => {
        btn.textContent = labels.copied;
        btn.dataset.copied = "true";
        window.setTimeout(() => {
          btn.textContent = labels.copy;
          delete btn.dataset.copied;
        }, 2000);
      });
    });

    toolbar.appendChild(btn);
    shell.appendChild(toolbar);
    shell.appendChild(block);
    shells.push(shell);
  });

  return () => {
    shells.forEach((shell) => {
      const block = shell.querySelector(":scope > .highlight") ?? shell.querySelector(":scope > pre");
      if (block && shell.parentNode) {
        shell.parentNode.insertBefore(block, shell);
        shell.remove();
      }
    });
  };
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

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let disposed = false;
    let removeCodeEnhance: (() => void) | undefined;
    let removeTableEnhance: (() => void) | undefined;
    let removeMermaid: (() => void) | undefined;

    const mode = resolveColorMode(root, colorMode);

    void (async () => {
      removeTableEnhance = enhanceProseTables(root);
      removeCodeEnhance = enhanceCodeBlocks(root, labels);
      if (!disposed) {
        try {
          removeMermaid = await renderMermaidDiagrams(root, mode, mermaidLabels);
        } catch {
          // 单条语法错误时不阻断正文渲染
        }
      }
    })();

    return () => {
      disposed = true;
      removeTableEnhance?.();
      removeCodeEnhance?.();
      removeMermaid?.();
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
