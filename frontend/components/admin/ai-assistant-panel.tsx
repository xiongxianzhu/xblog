"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { AiThinkingPanel } from "@/components/admin/ai-thinking-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getAiSkillRecommend,
  getAiStatus,
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

type Props = {
  className?: string;
  onClose: () => void;
  title: string;
  content: string;
  onInsertAtCursor: (text: string) => void;
  onReplaceContent: (text: string) => void;
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
    <Field>
      <FieldLabel className="flex items-center gap-2">
        Skill
        {skillMode === "auto" && recommendedName ? (
          <Badge variant="secondary">推荐：{recommendedName}</Badge>
        ) : null}
      </FieldLabel>
      <Select value={skillMode} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="自动推荐" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">自动（推荐）</SelectItem>
          {enabledSkills.map((skill) => (
            <SelectItem key={skill.id} value={skill.id}>
              {skill.name}
            </SelectItem>
          ))}
        </SelectContent>
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
}: Props) {
  const { data: status } = useSWR("ai-status", getAiStatus);
  const { data: skills } = useSWR("ai-skills-assistant", listAiSkills);

  const [tab, setTab] = useState<TabKey>("chat");
  const [skillMode, setSkillMode] = useState<"auto" | string>("auto");
  const [recommendedName, setRecommendedName] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
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
  const enabledSkills = (skills ?? []).filter((s: AiSkill) => s.enabled);

  const chatContext = useMemo(
    () => [title, content, input, ...messages.map((m) => m.content)].join(" "),
    [title, content, input, messages],
  );
  const generateContext = useMemo(() => [topic, outline, title].join(" "), [topic, outline, title]);

  useEffect(() => {
    if (tab === "generate" && !topic && title) {
      setTopic(title);
    }
  }, [tab, title, topic]);

  useEffect(() => {
    if (skillMode !== "auto" || !aiReady) {
      return;
    }
    const action = tab === "generate" ? "generate" : "chat";
    const text = tab === "generate" ? generateContext : chatContext;
    const timer = window.setTimeout(() => {
      void getAiSkillRecommend(action, text)
        .then((result) => setRecommendedName(result.skill_name))
        .catch(() => setRecommendedName(null));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [skillMode, aiReady, tab, chatContext, generateContext]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, lastAssistant]);

  async function handleSendChat() {
    const text = input.trim();
    if (!text || streaming || !aiReady) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
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
          skill_id: skillMode === "auto" ? null : skillMode,
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
          onDone: (meta) => {
            if (meta.skill_name && skillMode === "auto") {
              setRecommendedName(meta.skill_name);
            }
          },
          onError: (message) => setError(message),
        },
      );
      setMessages((prev) => [...prev, { role: "assistant", content: assistant, thinking: thinking || undefined }]);
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

    try {
      let draft = "";
      let thinking = "";
      await streamAiComplete(
        {
          action: "generate",
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
        "flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-border/80 bg-muted/10 lg:min-h-[560px]",
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">AI 助手</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">对话改稿或从主题/大纲生成全文草稿。</p>
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
          <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="grid w-full shrink-0 grid-cols-2">
              <TabsTrigger value="chat">对话</TabsTrigger>
              <TabsTrigger value="generate">全文生成</TabsTrigger>
            </TabsList>

            <div className="mt-3 shrink-0">
              <SkillSelect
                skillMode={skillMode}
                recommendedName={recommendedName}
                enabledSkills={enabledSkills}
                onChange={setSkillMode}
              />
            </div>

            <TabsContent value="chat" className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
              <div ref={scrollRef} className="min-h-[200px] flex-1 space-y-3 overflow-y-auto rounded-md border bg-background/50 p-3">
                {!messages.length && !lastAssistant ? (
                  <p className="text-sm text-muted-foreground">例如：「帮我把第二段改得更口语化」</p>
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

              <div className="mt-3 shrink-0 space-y-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入改稿指令…"
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void handleSendChat();
                    }
                  }}
                />
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Ctrl+Enter 发送</span>
                  <Button type="button" disabled={streaming || !input.trim()} onClick={() => void handleSendChat()}>
                    {streaming ? "输出中…" : "发送"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="generate" className="mt-3 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
              <Field className="shrink-0">
                <FieldLabel>主题</FieldLabel>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="文章或页面主题" />
              </Field>

              <Field className="flex min-h-[220px] flex-1 flex-col">
                <FieldLabel>大纲（可选）</FieldLabel>
                <FieldDescription>列出章节与要点，结构越清晰，生成效果越好。</FieldDescription>
                <Textarea
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  placeholder={
                    "# 一、开篇\n" +
                    "引入主题，说明背景\n\n" +
                    "# 二、核心内容\n" +
                    "- 要点 A\n" +
                    "- 要点 B\n\n" +
                    "# 三、总结\n" +
                    "回顾与展望"
                  }
                  className="mt-1 min-h-[200px] flex-1 resize-y rounded-lg border-border/80 bg-background/60 px-4 py-3 text-sm leading-relaxed md:min-h-[260px]"
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
                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
                  <FieldLabel>预览</FieldLabel>
                  {generateThinking || (streaming && !generatePreview) ? (
                    <AiThinkingPanel thinking={generateThinking} streaming={streaming && !generatePreview} />
                  ) : null}
                  <pre className="max-h-[220px] min-h-[120px] flex-1 overflow-auto whitespace-pre-wrap rounded-md border bg-background/50 p-3 font-mono text-sm">
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

            {error ? <p className="mt-2 shrink-0 text-sm text-destructive">{error}</p> : null}
          </Tabs>
        )}
      </div>
    </aside>
  );
}
