import { Upload } from "antd";

import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteSiteLogo, uploadSiteLogo } from "@/lib/api";
import type { SitePublicTheme } from "@/lib/themes";

type SiteLogoEditorProps = {
  siteLogoUrl: string | null;
  onChange: (theme: SitePublicTheme) => void;
  disabled?: boolean;
};

const MAX_SITE_LOGO_BYTES = 5 * 1024 * 1024;

export function SiteLogoEditor({ siteLogoUrl, onChange, disabled }: SiteLogoEditorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFileChange(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    if (file.size > MAX_SITE_LOGO_BYTES) {
      setError("图片不能超过 5MB");
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
              {loading ? "处理中…" : "上传 LOGO"}
            </Button>
          </Upload>
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
        <p className="text-xs text-muted-foreground">
          支持 JPG、PNG、WebP、GIF，最大 5MB。上传后会覆盖下方 URL 字段。
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
