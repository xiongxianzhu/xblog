import { Check, Copy } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { highlightMarkdownCode } from "@/lib/api";
import "./code-highlight.css";

import { MERMAID_LANG } from "@/lib/mermaid-diagram";
import { type ProseCodeCopyLabels, parseMarkdownCodeChild } from "@/lib/prose-code-blocks";
import { cn } from "@/lib/utils";

type MarkdownPreBlockProps = ComponentProps<"pre"> & {
  labels: ProseCodeCopyLabels;
};

export function MarkdownPreBlock({ children, className, labels, ...props }: MarkdownPreBlockProps) {
  const { lang, text } = parseMarkdownCodeChild(children);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);
  const [highlighted, setHighlighted] = useState<{ text: string; lang: string; html: string } | null>(null);
  useEffect(() => {
    if (!lang || lang === MERMAID_LANG || text.length > 100_000 || lang.length > 64) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void highlightMarkdownCode(text, lang, controller.signal)
        .then(({ html }) => {
          if (!controller.signal.aborted) setHighlighted({ text, lang, html });
        })
        .catch(() => {
          /* Keep readable plain text when preview is unavailable. */
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lang, text]);

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
    window.clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="code-block-shell">
      <div className="code-block-toolbar">
        {lang ? <span className="code-lang-label">{lang}</span> : null}
        <button
          type="button"
          className="code-copy-btn"
          aria-label={copied ? labels.copied : labels.copyCodeAria}
          title={copied ? labels.copied : labels.copy}
          data-copied={copied ? "true" : undefined}
          onClick={() => void handleCopy()}
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          <span className="code-copy-feedback" role="status">
            {copied ? labels.copied : ""}
          </span>
        </button>
      </div>
      <pre className={cn("!mt-0 highlight", className)} {...props}>
        {highlighted?.text === text && highlighted.lang === lang ? (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: The authenticated endpoint emits only Pygments spans with escaped code, never raw Markdown HTML.
          <code dangerouslySetInnerHTML={{ __html: highlighted.html }} />
        ) : (
          children
        )}
      </pre>
    </div>
  );
}
