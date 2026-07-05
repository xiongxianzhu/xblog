import { Children, isValidElement, type ReactNode } from "react";

import { MERMAID_LANG } from "@/lib/mermaid-diagram";

export type ProseCodeCopyLabels = {
  copy: string;
  copied: string;
  copyCodeAria: string;
};

export function parseMarkdownCodeChild(children: ReactNode): { lang: string | null; text: string } {
  const child = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return { lang: null, text: "" };
  }

  const className = child.props.className ?? "";
  const langMatch = /language-([\w-]+)/.exec(className);
  const lang = langMatch?.[1] ?? null;
  const text = extractText(child.props.children).replace(/\n$/, "");

  return { lang, text };
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

export function enhanceProseCodeBlocks(root: HTMLElement, labels: ProseCodeCopyLabels) {
  const shells: HTMLDivElement[] = [];

  root.querySelectorAll("pre").forEach((pre) => {
    const block = pre.closest(".highlight") ?? pre;
    if (block.parentElement?.classList.contains("code-block-shell")) return;

    const code = pre.querySelector("code");
    let lang: string | null = block.getAttribute("data-code-language")?.trim() || null;
    if (!lang && code) {
      for (const className of code.classList) {
        if (className.startsWith("language-")) {
          lang = className.slice("language-".length);
          break;
        }
      }
    }
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
    for (const shell of shells) {
      if (!shell.isConnected) continue;

      const block = shell.querySelector(":scope > .highlight") ?? shell.querySelector(":scope > pre");
      const parent = shell.parentNode;
      if (!block || !parent || block.parentElement !== shell) continue;

      try {
        parent.insertBefore(block, shell);
        shell.remove();
      } catch {
        // React 可能已替换该子树，忽略即可。
      }
    }
  };
}
