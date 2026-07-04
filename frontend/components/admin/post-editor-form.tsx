"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

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

export function PostEditorForm({ initial, onSubmit }: Props) {
  const [values, setValues] = useState<PostFormValues>({ ...defaultValues, ...initial });
  const [tagsInput, setTagsInput] = useState((initial?.tag_slugs ?? []).join(", "));
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"draft" | "published">(initial?.status ?? "draft");

  function updateField<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...values,
        status: pendingStatus,
        excerpt: values.excerpt || null,
        cover_url: values.cover_url || null,
        tag_slugs: tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle>{initial?.title ? "编辑文章" : "新建文章"}</CardTitle>
        <CardDescription>支持 Markdown 语法，保存后可在前台预览。</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="title">标题</FieldLabel>
                <Input id="title" value={values.title} onChange={(e) => updateField("title", e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="slug">Slug</FieldLabel>
                <Input id="slug" value={values.slug} onChange={(e) => updateField("slug", e.target.value)} required />
                <FieldDescription>URL 路径，如 my-first-post</FieldDescription>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="excerpt">摘要</FieldLabel>
              <Textarea id="excerpt" value={values.excerpt} onChange={(e) => updateField("excerpt", e.target.value)} />
            </Field>

            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cover_url">封面 URL</FieldLabel>
                <Input id="cover_url" value={values.cover_url} onChange={(e) => updateField("cover_url", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="tags">标签 slug</FieldLabel>
                <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tech, life" />
                <FieldDescription>逗号分隔，需先在数据库中存在对应 tag</FieldDescription>
              </Field>
            </div>

            <Separator />

            <Field>
              <FieldLabel htmlFor="content_md">Markdown 正文</FieldLabel>
              <Textarea
                id="content_md"
                value={values.content_md}
                onChange={(e) => updateField("content_md", e.target.value)}
                className="min-h-[420px] font-mono text-sm leading-relaxed"
                required
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={loading} onClick={() => setPendingStatus("draft")}>
                保存草稿
              </Button>
              <Button type="submit" variant="secondary" disabled={loading} onClick={() => setPendingStatus("published")}>
                发布
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
