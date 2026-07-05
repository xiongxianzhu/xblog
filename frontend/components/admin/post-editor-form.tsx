"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AiAssistantPanel } from "@/components/admin/ai-assistant-panel";
import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { EditorAiAssistantLayout } from "@/components/admin/editor-ai-assistant-layout";
import { AiSelectionToolbar } from "@/components/admin/ai-selection-toolbar";
import { useAdminSidebar } from "@/components/admin/admin-sidebar-provider";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { PostCoverEditor } from "@/components/admin/post-cover-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { discardManagedPostCover } from "@/lib/pending-upload-cleanup";

type PostFormValues = {
  title: string;
  slug: string;
  content_md: string;
  excerpt: string;
  cover_url: string;
  status: "draft" | "published";
  tag_slugs: string[];
};

type Props = {
  initial?: Partial<PostFormValues>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onSuccess?: (status: "draft" | "published") => void;
};

const defaultValues: PostFormValues = {
  title: "",
  slug: "",
  content_md: "",
  excerpt: "",
  cover_url: "",
  status: "draft",
  tag_slugs: [],
};

export function PostEditorForm({ initial, onSubmit, onSuccess }: Props) {
  const tFeedback = useTranslations("admin.feedback");
  const { collapsed } = useAdminSidebar();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [values, setValues] = useState<PostFormValues>({ ...defaultValues, ...initial });
  const [savedCoverUrl, setSavedCoverUrl] = useState((initial?.cover_url ?? "").trim());
  const savedCoverUrlRef = useRef((initial?.cover_url ?? "").trim());
  const coverUrlRef = useRef((initial?.cover_url ?? "").trim());
  coverUrlRef.current = values.cover_url;
  savedCoverUrlRef.current = savedCoverUrl;

  useEffect(() => {
    return () => {
      void discardManagedPostCover(coverUrlRef.current, savedCoverUrlRef.current);
    };
  }, []);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState((initial?.tag_slugs ?? []).join(", "));
  const [activeSubmit, setActiveSubmit] = useState<"draft" | "published" | null>(null);
  const [pendingStatus, setPendingStatus] = useState<"draft" | "published">(initial?.status ?? "draft");

  const submitting = activeSubmit !== null;

  function updateField<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const status = pendingStatus;
    setActiveSubmit(status);
    try {
      await onSubmit({
        ...values,
        status,
        excerpt: values.excerpt || null,
        cover_url: values.cover_url.trim() || null,
        tag_slugs: tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      savedCoverUrlRef.current = values.cover_url.trim();
      setSavedCoverUrl(values.cover_url.trim());
      setValues((prev) => ({ ...prev, status }));
      const title = values.title.trim() || "未命名";
      toast.success(status === "published" ? tFeedback("published") : tFeedback("draftSaved"), {
        description:
          status === "published" ? `文章「${title}」已发布。` : `文章「${title}」已保存为草稿。`,
      });
      onSuccess?.(status);
    } catch (err) {
      toast.error(status === "published" ? tFeedback("publishFailed") : tFeedback("saveFailed"), {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setActiveSubmit(null);
    }
  }

  function applyAiSelection(next: string, range: { start: number; end: number }) {
    const current = values.content_md;
    const updated = current.slice(0, range.start) + next + current.slice(range.end);
    updateField("content_md", updated);
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
    updateField("content_md", updated);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + insert.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function replaceContent(text: string) {
    updateField("content_md", text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  const adminFieldClass = cn(adminBorderlessControlClass, adminBorderlessFocusClass);

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle>{initial?.title ? "编辑文章" : "新建文章"}</CardTitle>
        <CardDescription>支持 Markdown 语法，保存后可在前台预览。</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="pb-20">
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="title">标题</FieldLabel>
                <Input id="title" value={values.title} onChange={(e) => updateField("title", e.target.value)} required className={adminFieldClass} />
              </Field>
              <Field>
                <FieldLabel htmlFor="slug">Slug</FieldLabel>
                <Input id="slug" value={values.slug} onChange={(e) => updateField("slug", e.target.value)} required className={adminFieldClass} />
                <FieldDescription>URL 路径，如 my-first-post</FieldDescription>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="excerpt">摘要</FieldLabel>
              <Textarea id="excerpt" value={values.excerpt} onChange={(e) => updateField("excerpt", e.target.value)} className={adminFieldClass} />
            </Field>

            <div className="grid gap-6 md:grid-cols-2">
              <PostCoverEditor
                value={values.cover_url}
                savedCoverUrl={savedCoverUrl}
                onChange={(coverUrl) => updateField("cover_url", coverUrl)}
                disabled={submitting}
              />
              <Field>
                <FieldLabel htmlFor="tags">标签 slug</FieldLabel>
                <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tech, life" className={adminFieldClass} />
                <FieldDescription>逗号分隔；不存在时会自动创建标签（slug 如 tech、life）</FieldDescription>
              </Field>
            </div>

            <Separator />

            <Field>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <FieldLabel htmlFor="content_md">Markdown 正文</FieldLabel>
                <Button
                  type="button"
                  variant={assistantOpen ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setAssistantOpen((open) => !open)}
                >
                  {assistantOpen ? "收起 AI 助手" : "AI 助手"}
                </Button>
              </div>
              <EditorAiAssistantLayout
                assistantOpen={assistantOpen}
                editor={
                  <>
                    <AiSelectionToolbar
                      textareaRef={textareaRef}
                      content={values.content_md}
                      title={values.title}
                      onApply={applyAiSelection}
                    />
                    <MarkdownEditor
                      id="content_md"
                      textareaRef={textareaRef}
                      value={values.content_md}
                      onChange={(next) => updateField("content_md", next)}
                      required
                      placeholder={"# 标题\n\n正文段落…\n\n- 列表项\n\n> 引用"}
                    />
                  </>
                }
                assistant={
                  <AiAssistantPanel
                    className="h-full min-h-0"
                    title={values.title}
                    content={values.content_md}
                    onClose={() => setAssistantOpen(false)}
                    onInsertAtCursor={insertAtCursor}
                    onReplaceContent={replaceContent}
                    onUpdateExcerpt={(text) => updateField("excerpt", text)}
                  />
                }
              />
            </Field>
          </FieldGroup>

          <div
            className={cn(
              "admin-editor-actions fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center gap-3 border-t px-4 py-3 sm:px-5 lg:px-6 lg:transition-[left] lg:duration-200 lg:ease-out",
              collapsed ? "lg:left-16" : "lg:left-56",
            )}
          >
            <Button
              type="submit"
              variant="outline"
              disabled={submitting}
              onClick={() => setPendingStatus("draft")}
            >
              {activeSubmit === "draft" ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  保存中…
                </>
              ) : (
                "保存草稿"
              )}
            </Button>
            <Button type="submit" disabled={submitting} onClick={() => setPendingStatus("published")}>
              {activeSubmit === "published" ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  发布中…
                </>
              ) : (
                "发布"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
