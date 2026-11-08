import { Upload } from "antd";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
  adminFlatButtonClass,
} from "@/components/admin/ai-assistant-form-styles";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { localizeAdminNotice } from "@/lib/admin-messages";
import { uploadFriendLinkLogo } from "@/lib/api";
import { discardManagedFriendLinkLogo } from "@/lib/pending-upload-cleanup";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

const adminFieldClass = cn(adminBorderlessControlClass, adminBorderlessFocusClass);
const MAX_FRIEND_LINK_LOGO_BYTES = 5 * 1024 * 1024;
type FriendLinkLogoEditorProps = {
  value: string;
  savedLogoUrl?: string;
  onChange: (logoUrl: string) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
};
export function FriendLinkLogoEditor({
  value,
  savedLogoUrl = "",
  onChange,
  disabled,
  onUploadingChange,
}: FriendLinkLogoEditorProps) {
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
    if (file.size > MAX_FRIEND_LINK_LOGO_BYTES) {
      setError(txt("m0555"));
      return;
    }
    setError("");
    setLoading(true);
    onUploadingChange?.(true);
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
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
      onUploadingChange?.(false);
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
          <span className="text-xs text-muted-foreground">{txt("m0556")}</span>
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
          <Upload
            accept="image/*"
            showUploadList={false}
            disabled={disabled || loading}
            beforeUpload={(file) => {
              void handleFileChange(file);
              return false;
            }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={adminFlatButtonClass}
              disabled={disabled || loading}
            >
              <ImagePlusIcon data-icon="inline-start" />
              {loading ? txt("m0557") : txt("m0558")}
            </Button>
          </Upload>
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
              {txt("m0559")}
            </Button>
          ) : null}
        </div>
        <FieldDescription>{txt("m0560")}</FieldDescription>
        {error ? <p className="text-xs text-destructive">{localizeAdminNotice(error)}</p> : null}
      </div>
    </div>
  );
}
