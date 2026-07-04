"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PageFormValues = {
  title: string;
  content_md: string;
};

type PageEditorFormProps = {
  initial: PageFormValues;
  onSubmit: (values: PageFormValues) => Promise<void>;
};

export function PageEditorForm({ initial, onSubmit }: PageEditorFormProps) {
  const [values, setValues] = useState<PageFormValues>(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await onSubmit(values);
      setMessage("已保存");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">页面内容</CardTitle>
        <CardDescription>Markdown 格式，保存后前台 /projects 页面会更新。</CardDescription>
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
              <FieldLabel htmlFor="page-content">正文</FieldLabel>
              <Textarea
                id="page-content"
                value={values.content_md}
                onChange={(e) => setValues((prev) => ({ ...prev, content_md: e.target.value }))}
                rows={18}
                className="font-mono text-sm"
                required
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "保存中…" : "保存"}
              </Button>
              {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
