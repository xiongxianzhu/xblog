"use client";

import {
  BoldIcon,
  CodeIcon,
  EyeIcon,
  Heading1Icon,
  Heading2Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  Maximize2Icon,
  Minimize2Icon,
  QuoteIcon,
  StrikethroughIcon,
  TableIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAdminTheme } from "@/components/admin/theme-provider";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SitePublicColorMode } from "@/lib/themes";
import { ADMIN_MARKDOWN_EDITOR_BODY_HEIGHT } from "@/lib/admin-editor-layout";
import { cn } from "@/lib/utils";

type ViewMode = "edit" | "split" | "preview";

type MarkdownEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  minHeight?: number;
  required?: boolean;
  placeholder?: string;
};

type ToolbarAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (api: TextAreaApi) => void;
};

type TextAreaApi = {
  value: string;
  onChange: (value: string) => void;
  textarea: HTMLTextAreaElement;
};

function getTextAreaApi(
  textarea: HTMLTextAreaElement | null,
  value: string,
  onChange: (value: string) => void,
): TextAreaApi | null {
  if (!textarea) return null;
  return { value, onChange, textarea };
}

function applyEdit(api: TextAreaApi, nextValue: string, selectionStart: number, selectionEnd: number) {
  api.onChange(nextValue);
  requestAnimationFrame(() => {
    api.textarea.focus();
    api.textarea.setSelectionRange(selectionStart, selectionEnd);
  });
}

function wrapSelection(api: TextAreaApi, before: string, after: string, fallback: string) {
  const { textarea, value } = api;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || fallback;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  applyEdit(api, next, start + before.length, start + before.length + selected.length);
}

function insertLinePrefix(api: TextAreaApi, prefix: string) {
  const { textarea, value } = api;
  const start = textarea.selectionStart;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
  applyEdit(api, next, start + prefix.length, start + prefix.length);
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    label: "一级标题",
    icon: Heading1Icon,
    run: (api) => insertLinePrefix(api, "# "),
  },
  {
    label: "二级标题",
    icon: Heading2Icon,
    run: (api) => insertLinePrefix(api, "## "),
  },
  {
    label: "粗体",
    icon: BoldIcon,
    run: (api) => wrapSelection(api, "**", "**", "粗体"),
  },
  {
    label: "斜体",
    icon: ItalicIcon,
    run: (api) => wrapSelection(api, "*", "*", "斜体"),
  },
  {
    label: "删除线",
    icon: StrikethroughIcon,
    run: (api) => wrapSelection(api, "~~", "~~", "删除"),
  },
  {
    label: "链接",
    icon: LinkIcon,
    run: (api) => wrapSelection(api, "[", "](https://)", "链接文字"),
  },
  {
    label: "引用",
    icon: QuoteIcon,
    run: (api) => insertLinePrefix(api, "> "),
  },
  {
    label: "行内代码",
    icon: CodeIcon,
    run: (api) => wrapSelection(api, "`", "`", "code"),
  },
  {
    label: "代码块",
    icon: CodeIcon,
    run: (api) => wrapSelection(api, "```\n", "\n```", "代码"),
  },
  {
    label: "无序列表",
    icon: ListIcon,
    run: (api) => insertLinePrefix(api, "- "),
  },
  {
    label: "有序列表",
    icon: ListOrderedIcon,
    run: (api) => insertLinePrefix(api, "1. "),
  },
  {
    label: "图片",
    icon: ImageIcon,
    run: (api) => wrapSelection(api, "![", "](https://)", "描述"),
  },
  {
    label: "表格",
    icon: TableIcon,
    run: (api) => {
      const block = "| 列1 | 列2 |\n| --- | --- |\n|  |  |\n";
      const { textarea, value } = api;
      const start = textarea.selectionStart;
      const next = value.slice(0, start) + block + value.slice(start);
      applyEdit(api, next, start + block.length, start + block.length);
    },
  },
];

function MarkdownPreview({
  value,
  emptyHint,
  colorMode,
}: {
  value: string;
  emptyHint: string;
  colorMode: SitePublicColorMode;
}) {
  return <MarkdownContent content={value} emptyHint={emptyHint} colorMode={colorMode} />;
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  textareaRef: externalRef,
  minHeight,
  required,
  placeholder = "在此编写 Markdown…",
}: MarkdownEditorProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const { resolvedMode } = useAdminTheme();
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [fullscreen, setFullscreen] = useState(false);

  const bodyHeight = fullscreen ? undefined : (minHeight ?? ADMIN_MARKDOWN_EDITOR_BODY_HEIGHT);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  const viewButtons: { mode: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = useMemo(
    () => [
      { mode: "edit", label: "编辑", icon: CodeIcon },
      { mode: "split", label: "分屏", icon: Minimize2Icon },
      { mode: "preview", label: "预览", icon: EyeIcon },
    ],
    [],
  );

  function runToolbarAction(action: ToolbarAction) {
    const api = getTextAreaApi(textareaRef.current, value, onChange);
    if (!api) return;
    action.run(api);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    const actionMap: Record<string, ToolbarAction | undefined> = {
      b: TOOLBAR_ACTIONS.find((item) => item.label === "粗体"),
      i: TOOLBAR_ACTIONS.find((item) => item.label === "斜体"),
      k: TOOLBAR_ACTIONS.find((item) => item.label === "链接"),
    };
    const action = actionMap[key];
    if (!action) return;
    event.preventDefault();
    runToolbarAction(action);
  }

  return (
    <div
      className={cn(
        "admin-markdown-editor overflow-hidden rounded-[2px] border border-input bg-background shadow-sm",
        fullscreen && "fixed inset-0 z-[120] flex flex-col rounded-none border-0 shadow-none",
      )}
      data-color-mode={resolvedMode}
      data-fullscreen={fullscreen ? "true" : undefined}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border/80 bg-muted/40 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {TOOLBAR_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 px-0 text-muted-foreground hover:text-foreground"
                title={action.label}
                aria-label={action.label}
                onClick={() => runToolbarAction(action)}
              >
                <Icon className="size-4" />
              </Button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-0.5 rounded-[2px] border border-border/60 bg-background p-0.5">
          {viewButtons.map(({ mode, label, icon: Icon }) => (
            <Button
              key={mode}
              type="button"
              variant={viewMode === mode ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode(mode)}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
          <Button
            type="button"
            variant={fullscreen ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            title={fullscreen ? "退出全屏 (Esc)" : "全屏编辑"}
            aria-label={fullscreen ? "退出全屏" : "全屏编辑"}
            onClick={() => setFullscreen((prev) => !prev)}
          >
            {fullscreen ? <Minimize2Icon className="size-3.5" /> : <Maximize2Icon className="size-3.5" />}
            <span className="hidden sm:inline">{fullscreen ? "退出" : "全屏"}</span>
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "admin-markdown-editor-body grid min-h-0",
          fullscreen && "flex-1",
          viewMode === "split"
            ? "grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-2 lg:grid-rows-1"
            : "grid-cols-1 grid-rows-1",
        )}
        style={bodyHeight !== undefined ? { height: bodyHeight } : undefined}
      >
        {viewMode !== "preview" ? (
          <div className="relative flex min-h-0 flex-col overflow-hidden border-b border-border/60 lg:border-b-0 lg:border-r">
            <Textarea
              ref={textareaRef}
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              required={required}
              placeholder={placeholder}
              spellCheck={false}
              className="h-full min-h-0 w-full flex-1 resize-none overflow-y-auto rounded-none border-0 bg-background px-4 py-3 font-mono text-[13px] leading-6 text-foreground shadow-none focus-visible:ring-0"
            />
            <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-muted-foreground/70">
              Ctrl+B/I/K · Tab 缩进
            </div>
          </div>
        ) : null}

        {viewMode !== "edit" ? (
          <div className="flex min-h-0 flex-col overflow-hidden bg-card/50">
            <p className="shrink-0 px-4 pb-2 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              预览
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              <MarkdownPreview value={value} emptyHint="左侧输入 Markdown，此处实时渲染。" colorMode={resolvedMode} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
