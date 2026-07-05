"use client";

import { useState, type ComponentProps } from "react";

import { MERMAID_LANG } from "@/lib/mermaid-diagram";
import { parseMarkdownCodeChild, type ProseCodeCopyLabels } from "@/lib/prose-code-blocks";
import { cn } from "@/lib/utils";

type MarkdownPreBlockProps = ComponentProps<"pre"> & {
  labels: ProseCodeCopyLabels;
};

export function MarkdownPreBlock({ children, className, labels, ...props }: MarkdownPreBlockProps) {
  const { lang, text } = parseMarkdownCodeChild(children);
  const [copied, setCopied] = useState(false);

  if (lang === MERMAID_LANG) {
    return (
      <pre className={className} {...props}>
        {children}
      </pre>
    );
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="code-block-shell">
      <div className="code-block-toolbar">
        {lang ? <span className="code-lang-label">{lang}</span> : null}
        <button
          type="button"
          className="code-copy-btn"
          aria-label={labels.copyCodeAria}
          data-copied={copied ? "true" : undefined}
          onClick={() => void handleCopy()}
        >
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
      <pre className={cn("!mt-0", className)} {...props}>
        {children}
      </pre>
    </div>
  );
}

export function createMarkdownPreComponent(labels: ProseCodeCopyLabels) {
  return function MarkdownPre(props: ComponentProps<"pre">) {
    return <MarkdownPreBlock labels={labels} {...props} />;
  };
}
