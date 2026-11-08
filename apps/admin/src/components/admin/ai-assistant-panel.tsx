import { XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  AiAssistantSelectContent,
  AiAssistantSelectItem,
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { AiComposer, type AiComposerSendPayload } from "@/components/admin/ai-composer";
import { AiThinkingPanel } from "@/components/admin/ai-thinking-panel";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { localizeAdminNotice } from "@/lib/admin-messages";
import {
  type AiSkill,
  getAiSkillRecommend,
  getAiStatus,
  listAiProviders,
  listAiSkills,
  streamAiComplete,
} from "@/lib/ai-api";
import { useAdminMessages } from "@/lib/use-admin-messages";
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
  const txt = useAdminMessages();
  return (
    <Field className={generateFieldClass}>
      <FieldLabel className="flex items-center gap-2">
        {txt("m0796")}
        {skillMode === "auto" && recommendedName ? (
          <span className="text-xs font-normal text-muted-foreground">
            {txt("m0386")}
            {recommendedName}
          </span>
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
          <SelectValue placeholder={txt("m0387")} />
        </SelectTrigger>
        <AiAssistantSelectContent>
          <AiAssistantSelectItem value="auto">{txt("m0388")}</AiAssistantSelectItem>
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
  const txt = useAdminMessages();
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll the external DOM when streamed content changes.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming, lastAssistant]);
  async function runChat(payload: AiComposerSendPayload) {
    if (streaming || !aiReady) return;
    const userText = payload.text.trim();
    if (!userText) return;
    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: userText,
      },
    ];
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
          ...(payload.skillIds.length > 0
            ? {
                skill_ids: payload.skillIds,
              }
            : {}),
          messages: nextMessages,
          document: {
            title,
            content_md: content,
          },
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
          onError: (message) => setError(getAdminErrorMessage(message, "aiFailed")),
        },
      );
      const result = assistant.trim();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result,
          thinking: thinking || undefined,
        },
      ]);
      setLastAssistant("");
      setLastThinking("");
    } catch (err) {
      setError(getAdminErrorMessage(err));
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
          document: {
            title,
            content_md: content,
          },
          generate: {
            topic: subject,
            outline: outline.trim(),
          },
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
          onError: (message) => setError(getAdminErrorMessage(message, "aiFailed")),
        },
      );
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setStreaming(false);
    }
  }
  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text);
  }
  function handleOverwriteFull() {
    if (!generatePreview.trim()) return;
    if (content.trim() && !window.confirm(txt("m0391"))) {
      return;
    }
    onReplaceContent(generatePreview);
  }
  return (
    <aside
      className={cn(
        "admin-ai-assistant flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded border border-border bg-card",
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{txt("m0392")}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{txt("m0393")}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 shrink-0 px-0"
          onClick={onClose}
          aria-label={txt("m0394")}
        >
          <XIcon />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        {!aiReady ? (
          <p className="text-sm text-muted-foreground">
            {txt("m0395")}{" "}
            <Link href="/admin/ai/models" className="underline">
              {txt("m0396")}
            </Link>{" "}
            {txt("m0397")}
          </p>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as TabKey)}
            className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
          >
            <TabsList className="grid w-full shrink-0 grid-cols-2">
              <TabsTrigger value="chat">{txt("m0797")}</TabsTrigger>
              <TabsTrigger value="generate">{txt("m0398")}</TabsTrigger>
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
                  <p className="text-sm text-muted-foreground">{txt("m0399")}</p>
                ) : null}
                {messages.map((msg, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: Chat history is append-only; stream updates retain message positions.
                    key={`${msg.role}-${index}`}
                    className={msg.role === "user" ? "ml-4 text-right" : "mr-4 text-left"}
                  >
                    {msg.role === "assistant" && msg.thinking ? (
                      <AiThinkingPanel thinking={msg.thinking} className="mb-2" />
                    ) : null}
                    <div
                      className={`inline-block max-w-full rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "assistant" ? (
                      <div className="mt-1 flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onInsertAtCursor(msg.content)}
                        >
                          {txt("m0400")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(msg.content)}
                        >
                          {txt("m0401")}
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
                <FieldLabel>{txt("m0402")}</FieldLabel>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={txt("m0403")}
                  className={cn(adminBorderlessControlClass, adminBorderlessFocusClass)}
                />
              </Field>

              <div className="flex min-h-[180px] flex-1 flex-col gap-2">
                <FieldLabel htmlFor="ai-generate-outline" className="shrink-0">
                  {txt("m0404")}
                </FieldLabel>
                <FieldDescription className="m-0 shrink-0">{txt("m0405")}</FieldDescription>
                <Textarea
                  id="ai-generate-outline"
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  placeholder={txt("m0406")}
                  className={cn(
                    "min-h-[120px] flex-1 resize-y px-4 py-3 text-sm leading-relaxed sm:min-h-[180px]",
                    adminBorderlessControlClass,
                    adminBorderlessFocusClass,
                  )}
                />
              </div>

              <Button
                type="button"
                className="shrink-0 self-start"
                disabled={streaming || !topic.trim()}
                onClick={() => void handleGenerate()}
              >
                {streaming ? txt("m0407") : txt("m0408")}
              </Button>

              {(generatePreview || generateThinking || streaming) && (
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                  <FieldLabel>{txt("m0138")}</FieldLabel>
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
                    {!generatePreview && streaming ? txt("m0409") : null}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={streaming || !generatePreview.trim()}
                      onClick={() => onInsertAtCursor(generatePreview)}
                    >
                      {txt("m0400")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={streaming || !generatePreview.trim()}
                      onClick={handleOverwriteFull}
                    >
                      {txt("m0410")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!generatePreview.trim()}
                      onClick={() => handleCopy(generatePreview)}
                    >
                      {txt("m0401")}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {error ? <p className="shrink-0 text-sm text-destructive">{localizeAdminNotice(error)}</p> : null}
          </Tabs>
        )}
      </div>
    </aside>
  );
}
