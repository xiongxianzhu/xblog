"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";

import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
  adminFlatButtonClass,
} from "@/components/admin/ai-assistant-form-styles";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { uploadFriendLinkLogo } from "@/lib/api";
import { discardManagedFriendLinkLogo } from "@/lib/pending-upload-cleanup";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import { cn } from "@/lib/utils";

const adminFieldClass = cn(adminBorderlessControlClass, adminBorderlessFocusClass);
const MAX_FRIEND_LINK_LOGO_BYTES = 5 * 1024 * 1024;

type FriendLinkLogoEditorProps = {
  value: string;
  savedLogoUrl?: string;
  onChange: (logoUrl: string) => void;
  disabled?: boolean;
};

export function FriendLinkLogoEditor({
  value,
  savedLogoUrl = "",
  onChange,
  disabled,
}: FriendLinkLogoEditorProps) {
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
    if (file.size > MAX_FRIEND_LINK_LOGO_BYTES) {
      setError("图片不能超过 5MB");
      return;
    }

    setError("");
    setLoading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const previous = value.trim();
      const result = await uploadFriendLinkLogo(file);
      if (previous && previous !== result.logo_url) {
        await discardManagedFriendLinkLogo(previous, savedLogoUrl);
      }
      onChange(result.logo_url);
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
    await discardManagedFriendLinkLogo(value, savedLogoUrl);
    onChange("");
    setPreviewUrl(null);
    setError("");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex size-16 shrink-0 items-center justify-center">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="max-h-16 max-w-16 object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">无 LOGO</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/logo.png"
          disabled={disabled || loading}
          className={adminFieldClass}
          required
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={adminFlatButtonClass}
            disabled={disabled || loading}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlusIcon data-icon="inline-start" />
            {loading ? "上传中…" : "上传 LOGO"}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={adminFlatButtonClass}
              disabled={disabled || loading}
              onClick={() => void handleRemove()}
            >
              <Trash2Icon data-icon="inline-start" />
              移除
            </Button>
          ) : null}
        </div>
        <FieldDescription>必填。支持 JPG、PNG、WebP、GIF，最大 5MB；也可粘贴外链 URL。</FieldDescription>
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
