import { Loader2Icon, PanelRightCloseIcon, SparklesIcon } from "lucide-react";
import { useRef, useState } from "react";
import { AdminFeedbackDialog, type AdminFeedbackVariant } from "@/components/admin/admin-feedback-dialog";
import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { AiAssistantPanel } from "@/components/admin/ai-assistant-panel";
import { AiSelectionToolbar } from "@/components/admin/ai-selection-toolbar";
import { EditorAiAssistantLayout } from "@/components/admin/editor-ai-assistant-layout";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { useAdminMessages } from "@/lib/use-admin-messages";
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
  const txt = useAdminMessages();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [values, setValues] = useState<PageFormValues>(initial);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    variant: AdminFeedbackVariant;
    title: string;
    message?: string;
  }>({
    open: false,
    variant: "success",
    title: "",
  });
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSubmit(values);
      setFeedback({
        open: true,
        variant: "success",
        title: txt("m0616"),
        message: txt("m0617", {
          p0: previewPath,
        }),
      });
      onSuccess?.();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: txt("m0434"),
        message: getAdminErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }
  function applyAiSelection(
    next: string,
    range: {
      start: number;
      end: number;
    },
  ) {
    const current = values.content_md;
    const updated = current.slice(0, range.start) + next + current.slice(range.end);
    setValues((prev) => ({
      ...prev,
      content_md: updated,
    }));
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
    setValues((prev) => ({
      ...prev,
      content_md: updated,
    }));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + insert.length;
      el.setSelectionRange(cursor, cursor);
    });
  }
  function replaceContent(text: string) {
    setValues((prev) => ({
      ...prev,
      content_md: text,
    }));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }
  const adminFieldClass = cn(adminBorderlessControlClass, adminBorderlessFocusClass);
  return (
    <>
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">{txt("m0618")}</CardTitle>
          <CardDescription>
            {txt("m0619")}
            {previewPath}
            {txt("m0620")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="page-title">{txt("m0208")}</FieldLabel>
                <Input
                  id="page-title"
                  value={values.title}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  required
                  className={adminFieldClass}
                />
              </Field>
              <Field>
                <div className="admin-editor-heading mb-2 flex flex-wrap items-center justify-between gap-3">
                  <FieldLabel htmlFor="page-content">{txt("m0621")}</FieldLabel>
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
                    <span>{assistantOpen ? txt("m0622") : txt("m0392")}</span>
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
                        id="page-content"
                        textareaRef={textareaRef}
                        value={values.content_md}
                        onChange={(content_md) =>
                          setValues((prev) => ({
                            ...prev,
                            content_md,
                          }))
                        }
                        required
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
                    />
                  }
                />
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2Icon className="animate-spin" />
                      {txt("m0015")}
                    </>
                  ) : (
                    txt("m0465")
                  )}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <AdminFeedbackDialog
        open={feedback.open}
        onOpenChange={(open) =>
          setFeedback((prev) => ({
            ...prev,
            open,
          }))
        }
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
