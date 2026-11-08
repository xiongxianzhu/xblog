import { Upload } from "antd";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { localizeAdminNotice } from "@/lib/admin-messages";
import { deleteSiteLogo, uploadSiteLogo } from "@/lib/api";
import type { SitePublicTheme } from "@/lib/themes";
import { useAdminMessages } from "@/lib/use-admin-messages";

type SiteLogoEditorProps = {
  siteLogoUrl: string | null;
  onChange: (theme: SitePublicTheme) => void;
  disabled?: boolean;
};
const MAX_SITE_LOGO_BYTES = 5 * 1024 * 1024;
export function SiteLogoEditor({ siteLogoUrl, onChange, disabled }: SiteLogoEditorProps) {
  const txt = useAdminMessages();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleFileChange(file: File) {
    if (!file.type.startsWith("image/")) {
      setError(txt("m0554"));
      return;
    }
    if (file.size > MAX_SITE_LOGO_BYTES) {
      setError(txt("m0555"));
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
      setError(getAdminErrorMessage(err));
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
      setError(getAdminErrorMessage(err));
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
          <span className="text-xs text-muted-foreground">{txt("m0556")}</span>
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
              {loading ? txt("m0309") : txt("m0558")}
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
              {txt("m0559")}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{txt("m0729")}</p>
        {error ? <p className="text-xs text-destructive">{localizeAdminNotice(error)}</p> : null}
      </div>
    </div>
  );
}
