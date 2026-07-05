"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

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
};

type CopyLabels = {
  copy: string;
  copied: string;
  copyCodeAria: string;
};

function extractCodeLanguage(pre: Element, block: Element): string | null {
  const fromData = block.getAttribute("data-code-language")?.trim();
  if (fromData) return fromData;

  const code = pre.querySelector("code");
  if (!code) return null;

  for (const className of code.classList) {
    if (className.startsWith("language-")) {
      return className.slice("language-".length);
    }
  }

  return null;
}

function enhanceCodeBlocks(root: HTMLElement, labels: CopyLabels) {
  const shells: HTMLDivElement[] = [];

  root.querySelectorAll("pre").forEach((pre) => {
    const block = pre.closest(".highlight") ?? pre;
    if (block.parentElement?.classList.contains("code-block-shell")) return;

    const shell = document.createElement("div");
    shell.className = "code-block-shell";
    block.parentNode?.insertBefore(shell, block);

    const toolbar = document.createElement("div");
    toolbar.className = "code-block-toolbar";

    const lang = extractCodeLanguage(pre, block);
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

export function ProseHtml({ html, className }: ProseHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("common");
  const labels: CopyLabels = {
    copy: t("copy"),
    copied: t("copied"),
    copyCodeAria: t("copyCodeAria"),
  };

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return enhanceCodeBlocks(root, labels);
  }, [html, labels.copy, labels.copied, labels.copyCodeAria]);

  return (
    <div
      ref={ref}
      className={cn(proseHtmlClassName, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
