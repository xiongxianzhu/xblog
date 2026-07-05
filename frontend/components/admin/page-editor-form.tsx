"use client";

import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";

import { AiAssistantPanel } from "@/components/admin/ai-assistant-panel";
import { AiSelectionToolbar } from "@/components/admin/ai-selection-toolbar";
import { AdminFeedbackDialog, type AdminFeedbackVariant } from "@/components/admin/admin-feedback-dialog";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PageFormValues = {
  title: string;
  content_md: string;
};

type PageEditorFormProps = {
  initial: PageFormValues;
  previewPath: string;
  onSubmit: (values: PageFormValues) => Promise<void>;
  onSuccess?: () => void;
};

export function PageEditorForm({ initial, previewPath, onSubmit, onSuccess }: PageEditorFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [values, setValues] = useState<PageFormValues>(initial);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    variant: AdminFeedbackVariant;
    title: string;
    message?: string;
  }>({ open: false, variant: "success", title: "" });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSubmit(values);
      setFeedback({
        open: true,
        variant: "success",
        title: "已保存",
        message: `前台 ${previewPath} 页面已更新。`,
      });
      onSuccess?.();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "保存失败",
        message: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setLoading(false);
    }
  }

  function applyAiSelection(next: string, range: { start: number; end: number }) {
    const current = values.content_md;
    const updated = current.slice(0, range.start) + next + current.slice(range.end);
    setValues((prev) => ({ ...prev, content_md: updated }));
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const cursor = range.start + next.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = values.content_md;
    const insert = text.endsWith("\n") ? text : `${text}\n`;
    const updated = current.slice(0, start) + insert + current.slice(end);
    setValues((prev) => ({ ...prev, content_md: updated }));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + insert.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function replaceContent(text: string) {
    setValues((prev) => ({ ...prev, content_md: text }));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <>
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">页面内容</CardTitle>
          <CardDescription>Markdown 格式，保存后前台 {previewPath} 会更新。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="page-title">标题</FieldLabel>
                <Input
                  id="page-title"
                  value={values.title}
                  onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </Field>
              <Field>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel htmlFor="page-content">正文</FieldLabel>
                  <Button
                    type="button"
                    variant={assistantOpen ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setAssistantOpen((open) => !open)}
                  >
                    {assistantOpen ? "收起 AI 助手" : "AI 助手"}
                  </Button>
                </div>
                <div
                  className={cn(
                    "grid gap-4",
                    assistantOpen && "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-stretch",
                  )}
                >
                  <div className="min-w-0">
                    <AiSelectionToolbar
                      textareaRef={textareaRef}
                      content={values.content_md}
                      title={values.title}
                      onApply={applyAiSelection}
                    />
                    <MarkdownEditor
                      id="page-content"
                      textareaRef={textareaRef}
                      value={values.content_md}
                      onChange={(content_md) => setValues((prev) => ({ ...prev, content_md }))}
                      required
                    />
                  </div>
                  {assistantOpen ? (
                    <AiAssistantPanel
                      title={values.title}
                      content={values.content_md}
                      onClose={() => setAssistantOpen(false)}
                      onInsertAtCursor={insertAtCursor}
                      onReplaceContent={replaceContent}
                    />
                  ) : null}
                </div>
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2Icon className="animate-spin" />
                      保存中…
                    </>
                  ) : (
                    "保存"
                  )}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <AdminFeedbackDialog
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
