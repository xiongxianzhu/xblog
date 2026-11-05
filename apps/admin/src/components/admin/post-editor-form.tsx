import { Loader2Icon, PanelRightCloseIcon, PinIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import { useAdminSidebar } from "@/components/admin/admin-sidebar-provider";
import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { AiAssistantPanel } from "@/components/admin/ai-assistant-panel";
import { AiSelectionToolbar } from "@/components/admin/ai-selection-toolbar";
import { EditorAiAssistantLayout } from "@/components/admin/editor-ai-assistant-layout";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { PostCoverEditor } from "@/components/admin/post-cover-editor";
import { POST_TAG_INPUT_MAX_TAGS, PostTagInput } from "@/components/admin/post-tag-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listAiProviders, listAiSkills, streamAiComplete } from "@/lib/ai-api";
import { ApiError } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { discardManagedPostCover } from "@/lib/pending-upload-cleanup";
import { cn } from "@/lib/utils";

type PostFormValues = {
  title: string;
  slug: string;
  content_md: string;
  excerpt: string;
  cover_url: string;
  status: "draft" | "published";
  tags: string[];
  is_pinned: boolean;
};

const metadataFields = {
  title: { label: "标题", instruction: "生成一个准确、简洁的文章标题，使用文章的语言。" },
  slug: { label: "Slug", instruction: "生成一个简洁的英文 URL slug，只用小写英文字母、数字和连字符。" },
  excerpt: { label: "摘要", instruction: "用文章的语言写一段简洁摘要，只概括已有信息，约 80 至 120 字。" },
};
type MetadataField = keyof typeof metadataFields;

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
  tags: [],
  is_pinned: false,
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
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [activeSubmit, setActiveSubmit] = useState<"draft" | "published" | null>(null);

  const submitting = activeSubmit !== null;

  const { data: providers } = useSWR("ai-providers", listAiProviders);
  const available = providers?.filter((provider) => provider.enabled && provider.has_api_key);
  const provider = available?.find((item) => item.is_default) ?? available?.[0];
  const [generating, setGenerating] = useState<MetadataField | null>(null);
  const hasContext = Boolean(values.title.trim() || values.excerpt.trim() || values.content_md.trim());

  async function generateField(field: MetadataField) {
    if (generating || !hasContext || !provider) return;
    setGenerating(field);
    let result = "";
    let failure = "";
    let complete = false;
    try {
      const excerptSkill =
        field === "excerpt"
          ? (await listAiSkills()).find((skill) => skill.name === "blog-excerpt-zh" && skill.enabled)
          : undefined;
      await streamAiComplete(
        {
          action: "chat",
          provider_id: provider.id,
          skill_id: excerptSkill?.id,
          document: { title: values.title, content_md: values.content_md.slice(0, 4000) },
          messages: [
            {
              role: "user",
              content: `现有摘要：${values.excerpt.slice(0, 500)}\n${metadataFields[field].instruction}只输出一个结果，不要解释、引号、标题前缀或 Markdown 格式。`,
            },
          ],
        },
        {
          onDelta: (delta) => {
            result += delta;
          },
          onError: (message) => {
            failure = message;
          },
          onDone: () => {
            complete = true;
          },
        },
      );
      if (failure || !complete) throw new Error(failure || "模型响应中断，请重试。");
      let text = result.trim();
      if (field === "slug")
        text = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 200)
          .replace(/^-+|-+$/g, "");
      if (!text) throw new Error("模型未返回可用文本，请重试。");
      if (field !== "excerpt" && text.length > 200) throw new Error("结果超过 200 字，请重试。");
      updateField(field, text);
      if (field === "excerpt" && Array.from(text).length > 500) setShowValidation(true);
    } catch (err) {
      toast.error("生成失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    } finally {
      setGenerating(null);
    }
  }

  function metadataLabel(field: MetadataField) {
    const { label } = metadataFields[field];
    return (
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={field}>{label}</FieldLabel>
        {Boolean(provider) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`AI 生成${label}`}
            title={hasContext ? `根据文章内容生成${label}` : "请先填写标题、摘要或正文"}
            disabled={submitting || generating !== null || !hasContext}
            onClick={() => void generateField(field)}
          >
            {generating === field ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            <span>{generating === field ? "生成中…" : "AI 生成"}</span>
          </Button>
        )}
      </div>
    );
  }

  function preventEnterSubmit(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") return;
    if (event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
  }

  function updateField<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const [showValidation, setShowValidation] = useState(false);
  const [takenSlug, setTakenSlug] = useState<string | null>(null);
  const errors: Partial<Record<"title" | "slug" | "excerpt" | "cover_url", string>> = {};
  for (const key of ["title", "slug"] as const) {
    const value = values[key].trim();
    const label = metadataFields[key].label;
    if (!value) errors[key] = `请填写${label}。`;
    else if (Array.from(value).length > 200) errors[key] = `${label}最多 200 个字符。`;
  }
  if (takenSlug === values.slug.trim()) errors.slug = "这个 Slug 已被使用，请换一个。";
  if (Array.from(values.excerpt).length > 500) errors.excerpt = "摘要最多 500 个字符，请缩短后提交。";
  if (Array.from(values.cover_url.trim()).length > 500) errors.cover_url = "封面地址最多 500 个字符。";
  function fieldHint(key: keyof typeof errors) {
    return showValidation && errors[key] ? (
      <span id={`${key}-error`} className="text-xs text-destructive" role="alert">
        {errors[key]}
      </span>
    ) : null;
  }

  async function handleSubmit(status: "draft" | "published") {
    setShowValidation(true);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    setActiveSubmit(status);
    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        slug: values.slug.trim(),
        status,
        excerpt: values.excerpt || null,
        cover_url: values.cover_url.trim() || null,
        tag_slugs: tags,
        is_pinned: values.is_pinned,
      });
      savedCoverUrlRef.current = values.cover_url.trim();
      setSavedCoverUrl(values.cover_url.trim());
      setValues((prev) => ({ ...prev, status }));
      const title = values.title.trim() || "未命名";
      toast.success(status === "published" ? tFeedback("published") : tFeedback("draftSaved"), {
        description: status === "published" ? `文章「${title}」已发布。` : `文章「${title}」已保存为草稿。`,
      });
      onSuccess?.(status);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && /slug/i.test(err.message)) {
        setTakenSlug(values.slug.trim());
        document.getElementById("slug")?.focus();
        return;
      }
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
        <form onSubmit={(event) => event.preventDefault()} onKeyDown={preventEnterSubmit} className="pb-20">
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                {metadataLabel("title")}
                <Input
                  id="title"
                  aria-invalid={showValidation && Boolean(errors.title)}
                  aria-describedby={showValidation && errors.title ? "title-error" : undefined}
                  value={values.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                  className={adminFieldClass}
                />
                {fieldHint("title")}
              </Field>
              <Field>
                {metadataLabel("slug")}
                <Input
                  id="slug"
                  aria-invalid={showValidation && Boolean(errors.slug)}
                  aria-describedby={showValidation && errors.slug ? "slug-error" : undefined}
                  value={values.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  required
                  className={adminFieldClass}
                />
                {fieldHint("slug")}
                <FieldDescription>URL 路径，如 my-first-post</FieldDescription>
              </Field>
            </div>

            <Field>
              {metadataLabel("excerpt")}
              <Textarea
                id="excerpt"
                aria-invalid={showValidation && Boolean(errors.excerpt)}
                aria-describedby={showValidation && errors.excerpt ? "excerpt-error" : undefined}
                value={values.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                className={adminFieldClass}
              />
              {fieldHint("excerpt")}
            </Field>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <PostCoverEditor
                  value={values.cover_url}
                  savedCoverUrl={savedCoverUrl}
                  onChange={(coverUrl) => updateField("cover_url", coverUrl)}
                  disabled={submitting}
                />
                {fieldHint("cover_url")}
              </div>
              <Field>
                <FieldLabel htmlFor="tags">标签</FieldLabel>
                <PostTagInput id="tags" value={tags} onChange={setTags} disabled={submitting} />
                <FieldDescription>
                  {tags.length >= POST_TAG_INPUT_MAX_TAGS
                    ? `已达 ${POST_TAG_INPUT_MAX_TAGS} 个标签上限`
                    : `还可添加 ${POST_TAG_INPUT_MAX_TAGS - tags.length} 个标签；按 Enter 创建`}
                </FieldDescription>
              </Field>
            </div>

            <Field className="flex flex-row items-center justify-between gap-4 rounded-md border border-border/60 px-4 py-3">
              <div className="space-y-1">
                <FieldLabel htmlFor="is-pinned" className="flex items-center gap-2">
                  <PinIcon className="size-4 text-primary" />
                  置顶文章
                </FieldLabel>
                <FieldDescription>置顶后将在公开站博客列表与标签页优先展示。</FieldDescription>
              </div>
              <Switch
                id="is-pinned"
                checked={values.is_pinned}
                disabled={submitting}
                onCheckedChange={(checked) => updateField("is_pinned", checked)}
              />
            </Field>

            <Separator />

            <Field>
              <div className="admin-editor-heading mb-2 flex flex-wrap items-center justify-between gap-3">
                <FieldLabel htmlFor="content_md">Markdown 正文</FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  className="admin-assistant-toggle"
                  aria-expanded={assistantOpen}
                  size="sm"
                  onClick={() => setAssistantOpen((open) => !open)}
                >
                  {assistantOpen ? (
                    <PanelRightCloseIcon aria-hidden className="size-4" />
                  ) : (
                    <SparklesIcon aria-hidden className="size-4" />
                  )}
                  <span>{assistantOpen ? "收起 AI 助手" : "AI 助手"}</span>
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
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => void handleSubmit("draft")}
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
            <Button type="button" disabled={submitting} onClick={() => void handleSubmit("published")}>
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
