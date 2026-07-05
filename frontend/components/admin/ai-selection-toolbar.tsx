"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { AiThinkingPanel } from "@/components/admin/ai-thinking-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAiStatus, streamAiComplete, type AiCompleteAction } from "@/lib/ai-api";

const ACTIONS: { action: AiCompleteAction; label: string }[] = [
  { action: "polish", label: "润色" },
  { action: "expand", label: "扩写" },
  { action: "shorten", label: "缩写" },
  { action: "title", label: "改标题" },
];

type Props = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  title: string;
  onApply: (next: string, range: { start: number; end: number }) => void;
};

export function AiSelectionToolbar({ textareaRef, content, title, onApply }: Props) {
  const { data: status } = useSWR("ai-status", getAiStatus);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [previewThinking, setPreviewThinking] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceFullDocument, setReplaceFullDocument] = useState(false);
  const activeAction = useRef<AiCompleteAction>("polish");
  const activeRange = useRef<{ start: number; end: number } | null>(null);

  const aiReady = (status?.enabled_providers ?? 0) > 0;

  useEffect(() => {
    function syncSelection() {
      const el = textareaRef.current;
      if (!el) {
        setSelection(null);
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === end) {
        setSelection(null);
        return;
      }
      setSelection({ start, end, text: el.value.slice(start, end) });
    }

    const el = textareaRef.current;
    el?.addEventListener("mouseup", syncSelection);
    el?.addEventListener("keyup", syncSelection);
    return () => {
      el?.removeEventListener("mouseup", syncSelection);
      el?.removeEventListener("keyup", syncSelection);
    };
  }, [textareaRef]);

  async function runStream(action: AiCompleteAction, range: { start: number; end: number }, text: string, fullDoc: boolean) {
    if (!aiReady || !text.trim()) return;
    activeAction.current = action;
    activeRange.current = range;
    setReplaceFullDocument(fullDoc);
    setPreview("");
    setPreviewThinking("");
    setError(null);
    setPreviewOpen(true);
    setStreaming(true);
    try {
      await streamAiComplete(
        {
          action,
          selection: { text },
          document: { title, content_md: content },
        },
        {
          onDelta: (chunk) => setPreview((prev) => prev + chunk),
          onThinkingDelta: (chunk) => setPreviewThinking((prev) => prev + chunk),
          onError: (message) => setError(message),
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 请求失败");
    } finally {
      setStreaming(false);
    }
  }

  async function runAction(action: AiCompleteAction) {
    if (!selection) return;
    await runStream(action, { start: selection.start, end: selection.end }, selection.text, false);
  }

  async function runPolishAll() {
    if (!content.trim()) return;
    await runStream("polish", { start: 0, end: content.length }, content, true);
  }

  function applyPreview() {
    if (!activeRange.current) return;
    onApply(preview, activeRange.current);
    setPreviewOpen(false);
  }

  if (!aiReady) {
    return (
      <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        AI 写作未就绪：请先在{" "}
        <Link href="/admin/ai/models" className="font-medium text-foreground underline">
          设置 → AI 模型
        </Link>{" "}
        添加并激活至少一个提供商。
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-muted/40 px-3 py-2">
        <Button
          type="button"
          size="sm"
          disabled={streaming || !content.trim()}
          onClick={() => void runPolishAll()}
        >
          {streaming && replaceFullDocument && previewOpen ? (
            <>
              <Loader2Icon className="animate-spin" />
              润色中…
            </>
          ) : (
            <>
              <SparklesIcon />
              一键润色
            </>
          )}
        </Button>
        {selection ? (
          <>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <span className="text-xs text-muted-foreground">已选中 {selection.text.length} 字</span>
            {ACTIONS.map(({ action, label }) => (
              <Button key={action} type="button" size="sm" variant="secondary" onClick={() => void runAction(action)}>
                {label}
              </Button>
            ))}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">或选中一段文字后进行局部润色、扩写等</span>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI 预览</DialogTitle>
            <DialogDescription>
              {streaming
                ? "输出中…"
                : replaceFullDocument
                  ? "确认后将替换整篇 Markdown 正文。"
                  : "确认后将替换原选区。"}
            </DialogDescription>
          </DialogHeader>
          {(previewThinking || (streaming && !preview)) ? (
            <AiThinkingPanel thinking={previewThinking} streaming={streaming && !preview} />
          ) : null}
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 font-mono text-sm">
            {preview}
            {streaming ? (
              <span className="ml-0.5 inline-block animate-pulse text-primary" aria-hidden>
                ▍
              </span>
            ) : null}
            {!preview && streaming ? "等待模型响应…" : null}
          </pre>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={streaming}>
              取消
            </Button>
            <Button disabled={streaming || !preview.trim()} onClick={applyPreview}>
              {replaceFullDocument ? "替换全文" : "替换选区"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
