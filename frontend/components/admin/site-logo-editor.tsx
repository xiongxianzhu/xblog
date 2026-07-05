"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteSiteLogo, uploadSiteLogo } from "@/lib/api";
import type { SitePublicTheme } from "@/lib/themes";

type SiteLogoEditorProps = {
  siteLogoUrl: string | null;
  onChange: (theme: SitePublicTheme) => void;
  disabled?: boolean;
};

export function SiteLogoEditor({ siteLogoUrl, onChange, disabled }: SiteLogoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("图片不能超过 2MB");
      return;
    }

    setError("");
    setLoading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const saved = await uploadSiteLogo(file);
      onChange(saved);
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
    if (!siteLogoUrl) return;
    setError("");
    setLoading(true);
    try {
      const saved = await deleteSiteLogo();
      onChange(saved);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  const displayUrl = previewUrl ?? siteLogoUrl;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex size-16 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 p-2">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">无 LOGO</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlusIcon data-icon="inline-start" />
            {loading ? "处理中…" : "上传 LOGO"}
          </Button>
          {siteLogoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || loading}
              onClick={() => void handleRemove()}
            >
              <Trash2Icon data-icon="inline-start" />
              移除
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">支持 JPG、PNG、WebP、GIF，最大 2MB。上传后会覆盖下方 URL 字段。</p>
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
  );
}
