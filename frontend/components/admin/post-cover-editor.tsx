"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";

import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { uploadPostCover } from "@/lib/api";
import { discardManagedPostCover } from "@/lib/pending-upload-cleanup";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import { cn } from "@/lib/utils";

type PostCoverEditorProps = {
  value: string;
  savedCoverUrl?: string;
  onChange: (coverUrl: string) => void;
  disabled?: boolean;
};

export function PostCoverEditor({ value, savedCoverUrl = "", onChange, disabled }: PostCoverEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const displayUrl = resolveAdminAssetPreviewUrl(previewUrl ?? (value || null));

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("图片不能超过 5MB");
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
      setError(err instanceof Error ? err.message : "上传失败");
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
      <FieldLabel htmlFor="cover_url">封面</FieldLabel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative aspect-[21/9] min-h-[8rem] w-full max-w-md overflow-hidden rounded-sm border border-border/70 bg-muted/20 lg:w-72">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="block size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">暂无封面</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Input
            id="cover_url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… 或上传本地图片"
            disabled={disabled || loading}
            className={cn(adminBorderlessControlClass, adminBorderlessFocusClass)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || loading}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlusIcon data-icon="inline-start" />
              {loading ? "上传中…" : "上传封面"}
            </Button>
            {value ? (
              <Button type="button" variant="ghost" size="sm" disabled={disabled || loading} onClick={() => void handleRemove()}>
                <Trash2Icon data-icon="inline-start" />
                移除
              </Button>
            ) : null}
          </div>
          <FieldDescription>支持 JPG、PNG、WebP、GIF，最大 5MB；也可粘贴外链 URL。</FieldDescription>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
        </div>
      </div>
    </Field>
  );
}
