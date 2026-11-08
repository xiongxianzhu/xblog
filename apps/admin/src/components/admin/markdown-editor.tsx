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
import { ADMIN_MARKDOWN_EDITOR_BODY_HEIGHT } from "@/lib/admin-editor-layout";
import { adminText } from "@/lib/admin-messages";
import type { SitePublicColorMode } from "@/lib/themes";
import { useAdminMessages } from "@/lib/use-admin-messages";
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
  icon: React.ComponentType<{
    className?: string;
  }>;
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
  return {
    value,
    onChange,
    textarea,
  };
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
    get label() {
      return adminText("m0572");
    },
    icon: Heading1Icon,
    run: (api) => insertLinePrefix(api, "# "),
  },
  {
    get label() {
      return adminText("m0573");
    },
    icon: Heading2Icon,
    run: (api) => insertLinePrefix(api, "## "),
  },
  {
    get label() {
      return adminText("m0574");
    },
    icon: BoldIcon,
    run: (api) => wrapSelection(api, "**", "**", adminText("m0574")),
  },
  {
    get label() {
      return adminText("m0575");
    },
    icon: ItalicIcon,
    run: (api) => wrapSelection(api, "*", "*", adminText("m0575")),
  },
  {
    get label() {
      return adminText("m0576");
    },
    icon: StrikethroughIcon,
    run: (api) => wrapSelection(api, "~~", "~~", adminText("m0067")),
  },
  {
    get label() {
      return adminText("m0577");
    },
    icon: LinkIcon,
    run: (api) => wrapSelection(api, "[", "](https://)", adminText("m0578")),
  },
  {
    get label() {
      return adminText("m0579");
    },
    icon: QuoteIcon,
    run: (api) => insertLinePrefix(api, "> "),
  },
  {
    get label() {
      return adminText("m0580");
    },
    icon: CodeIcon,
    run: (api) => wrapSelection(api, "`", "`", "code"),
  },
  {
    get label() {
      return adminText("m0581");
    },
    icon: CodeIcon,
    run: (api) => wrapSelection(api, "```\n", "\n```", adminText("m0582")),
  },
  {
    get label() {
      return adminText("m0583");
    },
    icon: ListIcon,
    run: (api) => insertLinePrefix(api, "- "),
  },
  {
    get label() {
      return adminText("m0584");
    },
    icon: ListOrderedIcon,
    run: (api) => insertLinePrefix(api, "1. "),
  },
  {
    get label() {
      return adminText("m0115");
    },
    icon: ImageIcon,
    run: (api) => wrapSelection(api, "![", "](https://)", adminText("m0585")),
  },
  {
    get label() {
      return adminText("m0586");
    },
    icon: TableIcon,
    run: (api) => {
      const block = adminText("m0587");
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
  useAdminMessages();
  return <MarkdownContent content={value} emptyHint={emptyHint} colorMode={colorMode} />;
}
export function MarkdownEditor({
  id,
  value,
  onChange,
  textareaRef: externalRef,
  minHeight,
  required,
  placeholder = adminText("m0588"),
}: MarkdownEditorProps) {
  const txt = useAdminMessages();
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
  const viewButtons: {
    mode: ViewMode;
    label: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
  }[] = useMemo(
    () => [
      {
        mode: "edit",
        label: txt("m0039"),
        icon: CodeIcon,
      },
      {
        mode: "split",
        label: txt("m0589"),
        icon: Minimize2Icon,
      },
      {
        mode: "preview",
        label: txt("m0138"),
        icon: EyeIcon,
      },
    ],
    [txt],
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
      b: TOOLBAR_ACTIONS.find((item) => item.icon === BoldIcon),
      i: TOOLBAR_ACTIONS.find((item) => item.icon === ItalicIcon),
      k: TOOLBAR_ACTIONS.find((item) => item.icon === LinkIcon),
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
      <div className="admin-editor-toolbar">
        <fieldset className="admin-editor-tools" aria-label={txt("m0590")}>
          {TOOLBAR_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="sm"
                className="admin-editor-tool"
                disabled={viewMode === "preview"}
                title={action.label}
                aria-label={action.label}
                onClick={() => runToolbarAction(action)}
              >
                <Icon className="size-4" />
              </Button>
            );
          })}
        </fieldset>
        <fieldset className="admin-editor-views" aria-label={txt("m0591")}>
          {viewButtons.map(({ mode, label, icon: Icon }) => (
            <Button
              key={mode}
              type="button"
              variant="ghost"
              aria-pressed={viewMode === mode}
              aria-label={label}
              title={label}
              size="sm"
              className="admin-editor-view"
              onClick={() => setViewMode(mode)}
            >
              <Icon className="size-3.5" />
              <span>{label}</span>
            </Button>
          ))}
          <Button
            type="button"
            variant={fullscreen ? "secondary" : "ghost"}
            size="sm"
            className="admin-editor-fullscreen"
            aria-pressed={fullscreen}
            title={fullscreen ? txt("m0592") : txt("m0593")}
            aria-label={fullscreen ? txt("m0594") : txt("m0593")}
            onClick={() => setFullscreen((prev) => !prev)}
          >
            {fullscreen ? <Minimize2Icon className="size-3.5" /> : <Maximize2Icon className="size-3.5" />}
            <span className="hidden sm:inline">{fullscreen ? txt("m0595") : txt("m0596")}</span>
          </Button>
        </fieldset>
      </div>

      <div
        className={cn(
          "admin-markdown-editor-body grid min-h-0",
          fullscreen && "flex-1",
          viewMode === "split"
            ? "grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-2 lg:grid-rows-1"
            : "grid-cols-1 grid-rows-1",
        )}
        style={
          bodyHeight !== undefined
            ? {
                height: bodyHeight,
              }
            : undefined
        }
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
              {txt("m0597")}
            </div>
          </div>
        ) : null}

        {viewMode !== "edit" ? (
          <div className="flex min-h-0 flex-col overflow-hidden bg-card/50">
            <p className="shrink-0 px-4 pb-2 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {txt("m0138")}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              <MarkdownPreview value={value} emptyHint={txt("m0598")} colorMode={resolvedMode} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
