"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { AiComposer, type AiComposerSendPayload } from "@/components/admin/ai-composer";
import {
  AiAssistantSelectContent,
  AiAssistantSelectItem,
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { AiThinkingPanel } from "@/components/admin/ai-thinking-panel";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getAiSkillRecommend,
  getAiStatus,
  listAiProviders,
  listAiSkills,
  streamAiComplete,
  type AiSkill,
} from "@/lib/ai-api";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
};

type TabKey = "chat" | "generate";

const generateFieldClass = "shrink-0 gap-2";

type Props = {
  className?: string;
  onClose: () => void;
  title: string;
  content: string;
  onInsertAtCursor: (text: string) => void;
  onReplaceContent: (text: string) => void;
  onUpdateExcerpt?: (text: string) => void;
};

function SkillSelect({
  skillMode,
  recommendedName,
  enabledSkills,
  onChange,
}: {
  skillMode: "auto" | string;
  recommendedName: string | null;
  enabledSkills: AiSkill[];
  onChange: (value: string) => void;
}) {
  return (
    <Field className={generateFieldClass}>
      <FieldLabel className="flex items-center gap-2">
        Skill
        {skillMode === "auto" && recommendedName ? (
          <span className="text-xs font-normal text-muted-foreground">推荐：{recommendedName}</span>
        ) : null}
      </FieldLabel>
      <Select
        value={skillMode}
        onValueChange={(value) => {
          onChange(value);
          requestAnimationFrame(() => {
            (document.activeElement as HTMLElement | null)?.blur();
          });
        }}
      >
        <SelectTrigger className={cn(adminBorderlessControlClass, adminBorderlessFocusClass, "h-10 w-full")}>
          <SelectValue placeholder="自动推荐" />
        </SelectTrigger>
        <AiAssistantSelectContent>
          <AiAssistantSelectItem value="auto">自动（推荐）</AiAssistantSelectItem>
          {enabledSkills.map((skill) => (
            <AiAssistantSelectItem key={skill.id} value={skill.id}>
              {skill.name}
            </AiAssistantSelectItem>
          ))}
        </AiAssistantSelectContent>
      </Select>
    </Field>
  );
}

export function AiAssistantPanel({
  className,
  onClose,
  title,
  content,
  onInsertAtCursor,
  onReplaceContent,
  onUpdateExcerpt,
}: Props) {
  const { data: status } = useSWR("ai-status", getAiStatus);
  const { data: skills } = useSWR("ai-skills-assistant", listAiSkills);
  const { data: providers } = useSWR("ai-providers-assistant", listAiProviders);

  const [tab, setTab] = useState<TabKey>("chat");
  const [skillMode, setSkillMode] = useState<"auto" | string>("auto");
  const [recommendedName, setRecommendedName] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastAssistant, setLastAssistant] = useState("");
  const [lastThinking, setLastThinking] = useState("");

  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState("");
  const [generatePreview, setGeneratePreview] = useState("");
  const [generateThinking, setGenerateThinking] = useState("");

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const aiReady = (status?.enabled_providers ?? 0) > 0;
  const enabledSkills = useMemo(() => (skills ?? []).filter((skill: AiSkill) => skill.enabled), [skills]);
  const enabledProviders = useMemo(
    () => (providers ?? []).filter((provider) => provider.enabled && provider.has_api_key),
    [providers],
  );

  const generateContext = useMemo(() => [topic, outline, title].join(" "), [topic, outline, title]);

  useEffect(() => {
    if (tab !== "generate" || !title) return;
    setTopic((prev) => (prev === "" ? title : prev));
  }, [tab, title]);

  useEffect(() => {
    if (skillMode !== "auto" || !aiReady || tab !== "generate") {
      return;
    }
    const timer = window.setTimeout(() => {
      void getAiSkillRecommend("generate", generateContext)
        .then((result) => setRecommendedName(result.skill_name))
        .catch(() => setRecommendedName(null));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [skillMode, aiReady, tab, generateContext]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, lastAssistant]);

  async function runChat(payload: AiComposerSendPayload) {
    if (streaming || !aiReady) return;

    const userText = payload.text.trim();
    if (!userText) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setError(null);
    setLastAssistant("");
    setLastThinking("");
    setStreaming(true);

    try {
      let assistant = "";
      let thinking = "";
      await streamAiComplete(
        {
          action: "chat",
          provider_id: payload.providerId,
          ...(payload.skillIds.length > 0 ? { skill_ids: payload.skillIds } : {}),
          messages: nextMessages,
          document: { title, content_md: content },
        },
        {
          onDelta: (chunk) => {
            assistant += chunk;
            setLastAssistant(assistant);
          },
          onThinkingDelta: (chunk) => {
            thinking += chunk;
            setLastThinking(thinking);
          },
          onError: (message) => setError(message),
        },
      );

      const result = assistant.trim();
      setMessages((prev) => [...prev, { role: "assistant", content: result, thinking: thinking || undefined }]);
      setLastAssistant("");
      setLastThinking("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "对话失败");
    } finally {
      setStreaming(false);
    }
  }

  async function handleGenerate() {
    const subject = topic.trim();
    if (!subject || streaming || !aiReady) return;

    setError(null);
    setGeneratePreview("");
    setGenerateThinking("");
    setStreaming(true);

    const defaultProvider =
      enabledProviders.find((provider) => provider.is_default) ?? enabledProviders[0] ?? null;

    try {
      let draft = "";
      let thinking = "";
      await streamAiComplete(
        {
          action: "generate",
          provider_id: defaultProvider?.id ?? null,
          skill_id: skillMode === "auto" ? null : skillMode,
          document: { title, content_md: content },
          generate: { topic: subject, outline: outline.trim() },
        },
        {
          onDelta: (chunk) => {
            draft += chunk;
            setGeneratePreview(draft);
          },
          onThinkingDelta: (chunk) => {
            thinking += chunk;
            setGenerateThinking(thinking);
          },
          onDone: (meta) => {
            if (meta.skill_name && skillMode === "auto") {
              setRecommendedName(meta.skill_name);
            }
          },
          onError: (message) => setError(message),
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setStreaming(false);
    }
  }

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text);
  }

  function handleOverwriteFull() {
    if (!generatePreview.trim()) return;
    if (content.trim() && !window.confirm("将用生成的 Markdown 覆盖当前正文，此操作不可撤销。继续？")) {
      return;
    }
    onReplaceContent(generatePreview);
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/80 bg-muted/10",
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">AI 助手</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">输入 / 选择 Skill，或使用快捷操作。</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 shrink-0 px-0"
          onClick={onClose}
          aria-label="关闭 AI 助手"
        >
          <XIcon />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        {!aiReady ? (
          <p className="text-sm text-muted-foreground">
            请先在{" "}
            <Link href="/admin/ai/models" className="underline">
              设置 → AI 模型
            </Link>{" "}
            配置并激活提供商。
          </p>
        ) : (
          <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <TabsList className="grid w-full shrink-0 grid-cols-2">
              <TabsTrigger value="chat">Agent</TabsTrigger>
              <TabsTrigger value="generate">全文生成</TabsTrigger>
            </TabsList>

            <TabsContent
              value="chat"
              className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden data-[state=inactive]:hidden"
            >
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-md border bg-background/50 p-3"
              >
                {!messages.length && !lastAssistant ? (
                  <p className="text-sm text-muted-foreground">例如：输入 /blog-polish-zh 后描述改稿需求</p>
                ) : null}
                {messages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={msg.role === "user" ? "ml-4 text-right" : "mr-4 text-left"}
                  >
                    {msg.role === "assistant" && msg.thinking ? (
                      <AiThinkingPanel thinking={msg.thinking} className="mb-2" />
                    ) : null}
                    <div
                      className={`inline-block max-w-full rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "assistant" ? (
                      <div className="mt-1 flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onInsertAtCursor(msg.content)}>
                          插入光标
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(msg.content)}>
                          复制
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {streaming ? (
                  <div className="mr-4 space-y-2 text-left">
                    {lastThinking || !lastAssistant ? (
                      <AiThinkingPanel thinking={lastThinking} streaming={!lastAssistant} />
                    ) : null}
                    {lastAssistant || !lastThinking ? (
                      <div className="inline-block max-w-full rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
                        {lastAssistant}
                        <span className="ml-0.5 inline-block animate-pulse text-primary" aria-hidden>
                          ▍
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <AiComposer
                disabled={!aiReady}
                streaming={streaming}
                enabledSkills={enabledSkills}
                enabledProviders={enabledProviders}
                showExcerptAction={Boolean(onUpdateExcerpt)}
                onSend={runChat}
              />
            </TabsContent>

            <TabsContent
              value="generate"
              className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden data-[state=inactive]:hidden"
            >
              <SkillSelect
                skillMode={skillMode}
                recommendedName={recommendedName}
                enabledSkills={enabledSkills}
                onChange={setSkillMode}
              />

              <Field className={generateFieldClass}>
                <FieldLabel>主题</FieldLabel>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="文章或页面主题"
                  className={cn(adminBorderlessControlClass, adminBorderlessFocusClass)}
                />
              </Field>

              <Field className={cn(generateFieldClass, "min-h-[180px] flex-1")}>
                <FieldLabel>大纲（可选）</FieldLabel>
                <FieldDescription>列出章节与要点，结构越清晰，生成效果越好。</FieldDescription>
                <Textarea
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  placeholder={"# 一、开篇\n引入主题\n\n# 二、核心内容\n- 要点 A"}
                  className={cn(
                    "min-h-[160px] flex-1 resize-y px-4 py-3 text-sm leading-relaxed",
                    adminBorderlessControlClass,
                    adminBorderlessFocusClass,
                  )}
                />
              </Field>

              <Button
                type="button"
                className="shrink-0 self-start"
                disabled={streaming || !topic.trim()}
                onClick={() => void handleGenerate()}
              >
                {streaming ? "输出中…" : "生成草稿"}
              </Button>

              {(generatePreview || generateThinking || streaming) && (
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                  <FieldLabel>预览</FieldLabel>
                  {generateThinking || (streaming && !generatePreview) ? (
                    <AiThinkingPanel thinking={generateThinking} streaming={streaming && !generatePreview} />
                  ) : null}
                  <pre className="min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-md border bg-background/50 p-3 font-mono text-sm">
                    {generatePreview}
                    {streaming ? (
                      <span className="ml-0.5 inline-block animate-pulse text-primary" aria-hidden>
                        ▍
                      </span>
                    ) : null}
                    {!generatePreview && streaming ? "等待模型响应…" : null}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={streaming || !generatePreview.trim()}
                      onClick={() => onInsertAtCursor(generatePreview)}
                    >
                      插入光标
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={streaming || !generatePreview.trim()}
                      onClick={handleOverwriteFull}
                    >
                      覆盖全文
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!generatePreview.trim()}
                      onClick={() => handleCopy(generatePreview)}
                    >
                      复制
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {error ? <p className="shrink-0 text-sm text-destructive">{error}</p> : null}
          </Tabs>
        )}
      </div>
    </aside>
  );
}
