import { Upload } from "antd";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { localizeAdminNotice } from "@/lib/admin-messages";
import { uploadPostCover } from "@/lib/api";
import { discardManagedPostCover } from "@/lib/pending-upload-cleanup";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

type PostCoverEditorProps = {
  value: string;
  savedCoverUrl?: string;
  onChange: (coverUrl: string) => void;
  disabled?: boolean;
};
export function PostCoverEditor({ value, savedCoverUrl = "", onChange, disabled }: PostCoverEditorProps) {
  const txt = useAdminMessages();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const displayUrl = resolveAdminAssetPreviewUrl(previewUrl ?? (value || null));
  async function handleFileChange(file: File) {
    if (!file.type.startsWith("image/")) {
      setError(txt("m0554"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(txt("m0555"));
      return;
    }
    setError("");
    setLoading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    try {
      const previous = value.trim();
      const result = await uploadPostCover(file);
      if (previous && previous !== result.cover_url) {
        await discardManagedPostCover(previous, savedCoverUrl);
      }
      onChange(result.cover_url);
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
    } catch (err) {
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  async function handleRemove() {
    await discardManagedPostCover(value, savedCoverUrl);
    onChange("");
    setPreviewUrl(null);
    setError("");
  }
  return (
    <Field className="md:col-span-2">
      <FieldLabel htmlFor="cover_url">{txt("m0623")}</FieldLabel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative aspect-[21/9] min-h-[8rem] w-full max-w-md overflow-hidden rounded-sm border border-border/70 bg-muted/20 lg:w-72">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="block size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              {txt("m0624")}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Input
            id="cover_url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={txt("m0625")}
            disabled={disabled || loading}
            className={cn(adminBorderlessControlClass, adminBorderlessFocusClass)}
          />
          <div className="flex flex-wrap gap-2">
            <Upload
              accept="image/*"
              showUploadList={false}
              disabled={loading}
              beforeUpload={(file) => {
                void handleFileChange(file);
                return false;
              }}
            >
              <Button type="button" variant="outline" size="sm" disabled={disabled || loading}>
                <ImagePlusIcon data-icon="inline-start" />
                {loading ? txt("m0557") : txt("m0626")}
              </Button>
            </Upload>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || loading}
                onClick={() => void handleRemove()}
              >
                <Trash2Icon data-icon="inline-start" />
                {txt("m0559")}
              </Button>
            ) : null}
          </div>
          <FieldDescription>{txt("m0627")}</FieldDescription>
          {error ? <p className="text-xs text-destructive">{localizeAdminNotice(error)}</p> : null}
        </div>
      </div>
    </Field>
  );
}
