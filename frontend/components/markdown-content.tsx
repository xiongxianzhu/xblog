"use client";

import { memo, useInsertionEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { MarkdownPreBlock } from "@/components/markdown-pre-block";
import { renderMermaidDiagrams, type MermaidDiagramLabels } from "@/lib/mermaid-diagram";
import type { ProseCodeCopyLabels } from "@/lib/prose-code-blocks";
import type { SitePublicColorMode } from "@/lib/themes";
import { cn } from "@/lib/utils";

const markdownTableComponent: Components["table"] = ({ node: _node, ...props }) => (
  <div className="prose-table-wrap">
    <table {...props} />
  </div>
);

const MARKDOWN_COMPONENTS: Components = {
  table: markdownTableComponent,
};

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

function patchMarkdownChromeLabels(
  root: HTMLElement | null,
  codeLabels: ProseCodeCopyLabels,
  mermaidLabels: MermaidDiagramLabels,
) {
  if (!root) return;

  root.querySelectorAll<HTMLButtonElement>(".code-copy-btn:not([data-copied])").forEach((button) => {
    button.textContent = codeLabels.copy;
    button.setAttribute("aria-label", codeLabels.copyCodeAria);
  });

  root.querySelectorAll<HTMLButtonElement>(".mermaid-icon-btn:not(.mermaid-icon-btn--copy)").forEach((button) => {
    const text = button.textContent?.trim();
    if (text === "⤢" || text === "✕") {
      const isFullscreen = text === "✕";
      button.setAttribute("aria-label", isFullscreen ? mermaidLabels.close : mermaidLabels.fullscreen);
      button.title = isFullscreen ? mermaidLabels.close : mermaidLabels.fullscreen;
    }
  });

  root.querySelectorAll<HTMLButtonElement>(".mermaid-icon-btn--copy:not(.mermaid-icon-btn--copied)").forEach((button) => {
    button.setAttribute("aria-label", mermaidLabels.copySource);
    button.title = mermaidLabels.copySource;
    const tooltip = button.querySelector<HTMLElement>(".mermaid-icon-btn__tooltip");
    if (tooltip) tooltip.textContent = mermaidLabels.copied;
  });

  const padSymbols: Record<string, keyof MermaidDiagramLabels> = {
    "↑": "panUp",
    "←": "panLeft",
    "⟲": "reset",
    "→": "panRight",
    "−": "zoomOut",
    "↓": "panDown",
    "+": "zoomIn",
  };

  root.querySelectorAll<HTMLButtonElement>(".mermaid-pad .mermaid-icon-btn").forEach((button) => {
    const symbol = button.textContent?.trim();
    if (!symbol) return;
    const key = padSymbols[symbol];
    if (!key) return;
    button.setAttribute("aria-label", mermaidLabels[key]);
    button.title = mermaidLabels[key];
  });
}

type MarkdownProseProps = {
  content: string;
  className?: string;
  colorMode?: SitePublicColorMode;
  codeLabelsRef: RefObject<ProseCodeCopyLabels>;
  mermaidLabelsRef: RefObject<MermaidDiagramLabels>;
  rootRef: RefObject<HTMLDivElement | null>;
};

const MarkdownProse = memo(function MarkdownProse({
  content,
  className,
  colorMode,
  codeLabelsRef,
  mermaidLabelsRef,
  rootRef,
}: MarkdownProseProps) {
  const markdownComponents = useMemo<Components>(
    () => ({
      ...MARKDOWN_COMPONENTS,
      pre: (props) => <MarkdownPreBlock labels={codeLabelsRef.current} {...props} />,
    }),
    [codeLabelsRef],
  );

  const mermaidCleanupRef = useRef<(() => void) | undefined>();
  const mermaidRenderGenerationRef = useRef(0);

  // Mermaid 会命令式替换 pre；在 React 提交 DOM 变更前先还原，避免 removeChild 报错。
  useInsertionEffect(() => {
    return () => {
      mermaidCleanupRef.current?.();
      mermaidCleanupRef.current = undefined;
    };
  }, [content, colorMode]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const generation = ++mermaidRenderGenerationRef.current;
    let cancelled = false;
    const mode = resolveColorMode(root, colorMode);
    const isStale = () => cancelled || mermaidRenderGenerationRef.current !== generation;

    void (async () => {
      try {
        const cleanup = await renderMermaidDiagrams(root, mode, mermaidLabelsRef.current, {
          isCancelled: isStale,
        });
        if (isStale()) {
          cleanup();
          return;
        }
        mermaidCleanupRef.current = cleanup;
      } catch {
        // 单条语法错误时不阻断预览渲染
      }
    })();

    return () => {
      cancelled = true;
      mermaidCleanupRef.current?.();
      mermaidCleanupRef.current = undefined;
    };
  }, [content, colorMode, mermaidLabelsRef, rootRef]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-a:text-primary",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-img:inline prose-img:max-w-full prose-img:align-middle",
        "[&_p[align=center]]:text-center",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}, (prev, next) =>
  prev.content === next.content &&
  prev.colorMode === next.colorMode &&
  prev.className === next.className,
);

/** 与后端 Python markdown「extra」扩展一致：支持 GFM + 内联 HTML。 */
export function MarkdownContent({ content, className, emptyHint, colorMode }: MarkdownContentProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const codeLabelsRef = useRef<ProseCodeCopyLabels>({
    copy: t("copy"),
    copied: t("copied"),
    copyCodeAria: t("copyCodeAria"),
  });
  const mermaidLabelsRef = useRef<MermaidDiagramLabels>({
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
  });

  codeLabelsRef.current = {
    copy: t("copy"),
    copied: t("copied"),
    copyCodeAria: t("copyCodeAria"),
  };
  mermaidLabelsRef.current = {
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

  useLayoutEffect(() => {
    patchMarkdownChromeLabels(rootRef.current, codeLabelsRef.current, mermaidLabelsRef.current);
  }, [locale]);

  if (!content.trim()) {
    return emptyHint ? <p className="text-sm text-muted-foreground">{emptyHint}</p> : null;
  }

  return (
    <MarkdownProse
      content={content}
      className={className}
      colorMode={colorMode}
      codeLabelsRef={codeLabelsRef}
      mermaidLabelsRef={mermaidLabelsRef}
      rootRef={rootRef}
    />
  );
}
