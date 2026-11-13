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

function setCopyIcon(button: HTMLButtonElement, copied: boolean, labels: ProseCodeCopyLabels) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  for (const [key, value] of Object.entries({
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  }))
    svg.setAttribute(key, value);
  const path = document.createElementNS(ns, "path");
  path.setAttribute(
    "d",
    copied ? "M20 6 9 17l-5-5" : "M9 9h11v11H9z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  );
  svg.appendChild(path);
  const feedback = document.createElement("span");
  feedback.className = "code-copy-feedback";
  feedback.setAttribute("role", "status");
  feedback.textContent = copied ? labels.copied : "";
  button.replaceChildren(svg, feedback);
  button.title = copied ? labels.copied : labels.copy;
  button.setAttribute("aria-label", copied ? labels.copied : labels.copyCodeAria);
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
    setCopyIcon(btn, false, labels);
    btn.setAttribute("aria-label", labels.copyCodeAria);

    let resetTimer: number | undefined;
    btn.addEventListener("click", () => {
      const text = (pre.querySelector("code") ?? pre).textContent ?? "";
      void navigator.clipboard.writeText(text).then(() => {
        setCopyIcon(btn, true, labels);
        btn.dataset.copied = "true";
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          setCopyIcon(btn, false, labels);
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
