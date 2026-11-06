import { Popover } from "antd";
import { FileTextIcon, LayoutTemplateIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  AiAssistantSelectContent,
  AiAssistantSelectItem,
  aiAssistantModelSelectTriggerClass,
} from "@/components/admin/ai-assistant-form-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AiProvider, AiSkill } from "@/lib/ai-api";
import { cn } from "@/lib/utils";

const PROVIDER_STORAGE_KEY = "xblog-admin-ai-provider-id";

export type AiQuickAction = {
  id: string;
  label: string;
  skillName: string;
  prompt: string;
  icon: typeof SparklesIcon;
};

export const AI_QUICK_ACTIONS: AiQuickAction[] = [
  {
    id: "format",
    label: "智能排版",
    skillName: "blog-format-zh",
    prompt: "请对当前正文进行智能排版，修正标题层级、列表与空行，不改变语义与事实。",
    icon: LayoutTemplateIcon,
  },
  {
    id: "polish",
    label: "优化全文",
    skillName: "blog-polish-zh",
    prompt: "请优化当前正文，修正语病并提升可读性，保持结构与事实不变。",
    icon: SparklesIcon,
  },
  {
    id: "excerpt",
    label: "提取摘要",
    skillName: "blog-excerpt-zh",
    prompt: "请为当前文章提取一段适合作为 excerpt 的中文摘要。",
    icon: FileTextIcon,
  },
];

export type AiComposerSendPayload = {
  text: string;
  skillIds: string[];
  providerId: string | null;
};

export type AiComposerHandle = {
  applyPreset: (skill: AiSkill, prompt: string) => void;
  clearComposer: () => void;
};

type AiComposerProps = {
  disabled?: boolean;
  streaming?: boolean;
  enabledSkills: AiSkill[];
  enabledProviders: AiProvider[];
  showExcerptAction?: boolean;
  onSend: (payload: AiComposerSendPayload) => void | Promise<void>;
};

function providerLabel(provider: AiProvider) {
  const name = provider.name.trim();
  const model = provider.model.trim();
  if (!model || name.toLowerCase() === model.toLowerCase()) {
    return name || model;
  }
  return `${name} · ${model}`;
}

function detectSlashQuery(value: string, cursor: number): { start: number; query: string } | null {
  const before = value.slice(0, cursor);
  const match = /(?:^|\s)\/([\w-]*)$/.exec(before);
  if (!match) return null;
  const query = match[1] ?? "";
  const start = before.length - query.length - 1;
  return { start, query };
}

export const AiComposer = forwardRef<AiComposerHandle, AiComposerProps>(function AiComposer(
  { disabled = false, streaming = false, enabledSkills, enabledProviders, showExcerptAction = true, onSend },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<AiSkill[]>([]);
  const [providerId, setProviderId] = useState<string>("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashStart, setSlashStart] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIds = useMemo(() => new Set(selectedSkills.map((skill) => skill.id)), [selectedSkills]);

  const availableSkills = useMemo(
    () =>
      enabledSkills.filter(
        (skill) =>
          !selectedIds.has(skill.id) &&
          (slashQuery ? skill.name.toLowerCase().includes(slashQuery.toLowerCase()) : true),
      ),
    [enabledSkills, selectedIds, slashQuery],
  );

  const quickActions = useMemo(
    () => AI_QUICK_ACTIONS.filter((action) => showExcerptAction || action.id !== "excerpt"),
    [showExcerptAction],
  );

  const defaultProviderId = useMemo(() => {
    const stored = typeof window !== "undefined" ? window.sessionStorage.getItem(PROVIDER_STORAGE_KEY) : null;
    if (stored && enabledProviders.some((item) => item.id === stored)) {
      return stored;
    }
    return enabledProviders.find((item) => item.is_default)?.id ?? enabledProviders[0]?.id ?? "";
  }, [enabledProviders]);

  useEffect(() => {
    if (providerId) return;
    setProviderId(defaultProviderId);
  }, [defaultProviderId, providerId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset keyboard selection when the slash query or visibility changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [slashQuery, slashOpen]);

  function clearComposer() {
    setInput("");
    setSelectedSkills([]);
    setSlashOpen(false);
    setSlashQuery("");
    setSlashStart(null);
  }

  function fillComposer(prompt: string, skills: AiSkill[]) {
    setInput(prompt);
    setSelectedSkills(skills);
    setSlashOpen(false);
    setSlashQuery("");
    setSlashStart(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function removeSkill(skillId: string) {
    setSelectedSkills((prev) => prev.filter((skill) => skill.id !== skillId));
  }

  function addSkill(skill: AiSkill) {
    if (selectedIds.has(skill.id)) return;
    setSelectedSkills((prev) => [...prev, skill]);
    if (slashStart !== null && textareaRef.current) {
      const cursor = textareaRef.current.selectionStart;
      const next = input.slice(0, slashStart) + input.slice(cursor).replace(/^\s*/, "");
      setInput(next);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(slashStart, slashStart);
      });
    }
    setSlashOpen(false);
    setSlashQuery("");
    setSlashStart(null);
  }

  function updateSlashState(value: string, cursor: number) {
    const detected = detectSlashQuery(value, cursor);
    if (!detected) {
      setSlashOpen(false);
      setSlashQuery("");
      setSlashStart(null);
      return;
    }

    const pool = enabledSkills.filter((skill) => !selectedIds.has(skill.id));
    const filtered = pool.filter((skill) =>
      detected.query ? skill.name.toLowerCase().includes(detected.query.toLowerCase()) : true,
    );
    if (filtered.length === 0) {
      setSlashOpen(false);
      setSlashQuery("");
      setSlashStart(null);
      return;
    }

    setSlashOpen(true);
    setSlashQuery(detected.query);
    setSlashStart(detected.start);
  }

  function handleInputChange(value: string) {
    setInput(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    updateSlashState(value, cursor);
  }

  async function submit(text: string, skills: AiSkill[], provider: string | null) {
    const trimmed = text.trim();
    if (!trimmed || disabled || streaming) return;
    await onSend({
      text: trimmed,
      skillIds: skills.map((skill) => skill.id),
      providerId: provider,
    });
    clearComposer();
  }

  useImperativeHandle(ref, () => ({
    applyPreset(skill: AiSkill, prompt: string) {
      fillComposer(prompt, [skill]);
    },
    clearComposer,
  }));

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (slashOpen && availableSkills.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % availableSkills.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + availableSkills.length) % availableSkills.length);
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const skill = availableSkills[activeIndex];
        if (skill) addSkill(skill);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashOpen(false);
        return;
      }
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit(input, selectedSkills, providerId || null);
    }
  }

  function handleQuickAction(action: AiQuickAction) {
    const skill = enabledSkills.find((item) => item.name === action.skillName);
    if (!skill || disabled || streaming) return;
    fillComposer(action.prompt, [skill]);
  }

  const composerDisabled = disabled || streaming || enabledProviders.length === 0;

  return (
    <div className="ai-composer flex min-w-0 shrink-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const skillReady = enabledSkills.some((item) => item.name === action.skillName);
          return (
            <Button
              key={action.id}
              type="button"
              variant="outline"
              size="sm"
              className="ai-composer-quick-action border-border bg-background text-xs font-normal"
              disabled={composerDisabled || !skillReady}
              onClick={() => handleQuickAction(action)}
            >
              <Icon className="size-3.5 opacity-70" />
              {action.label}
            </Button>
          );
        })}
      </div>

      <div className="relative min-w-0 overflow-hidden rounded border border-border bg-background focus-within:border-primary/40">
        {selectedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 border-b border-border/50 px-3 py-2">
            {selectedSkills.map((skill) => (
              <Badge
                key={skill.id}
                variant="secondary"
                className="gap-1 rounded-md pr-1 font-mono text-[11px] font-normal"
              >
                <span className="inline-flex items-center gap-1 align-middle">
                  <span>{skill.name}</span>
                  <button
                    type="button"
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm p-0 leading-none hover:bg-background/80"
                    aria-label={`移除 ${skill.name}`}
                    onClick={() => removeSkill(skill.id)}
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              </Badge>
            ))}
          </div>
        ) : null}

        <Popover
          open={slashOpen && availableSkills.length > 0}
          onOpenChange={setSlashOpen}
          placement="topLeft"
          trigger={[]}
          autoAdjustOverflow
          getPopupContainer={() => document.body}
          content={
            <div
              ref={listRef}
              role="listbox"
              aria-label="选择 Skill"
              className="max-h-44 w-80 max-w-[calc(100vw-32px)] overflow-y-auto"
            >
              {" "}
              {availableSkills.map((skill, index) => (
                <button
                  key={skill.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                    index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => addSkill(skill)}
                >
                  <span className="font-mono text-xs">{skill.name}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {skill.description}
                  </span>
                </button>
              ))}
            </div>
          }
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onClick={() => {
              const cursor = textareaRef.current?.selectionStart ?? input.length;
              updateSlashState(input, cursor);
            }}
            placeholder="输入创作需求，输入 / 选择 Skill…"
            disabled={composerDisabled}
            className="ai-composer-input min-h-[112px] resize-none rounded-none border-0 bg-transparent px-3 py-3 text-sm leading-6 shadow-none focus-visible:ring-0"
          />
        </Popover>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
          <Select
            value={providerId}
            onValueChange={(value) => {
              setProviderId(value);
              window.sessionStorage.setItem(PROVIDER_STORAGE_KEY, value);
              requestAnimationFrame(() => {
                (document.activeElement as HTMLElement | null)?.blur();
              });
            }}
            disabled={composerDisabled}
          >
            <SelectTrigger className={aiAssistantModelSelectTriggerClass}>
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <AiAssistantSelectContent align="start">
              {enabledProviders.map((provider) => (
                <AiAssistantSelectItem key={provider.id} value={provider.id} className="text-xs">
                  {providerLabel(provider)}
                </AiAssistantSelectItem>
              ))}
            </AiAssistantSelectContent>
          </Select>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1 px-3"
              title="发送（Ctrl+Enter）"
              disabled={composerDisabled || !input.trim()}
              onClick={() => void submit(input, selectedSkills, providerId || null)}
            >
              <SendIcon className="size-3.5" />
              发送
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
