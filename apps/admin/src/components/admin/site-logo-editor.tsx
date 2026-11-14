import { Upload } from "antd";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
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
  const uploadLock = useRef(false);
  async function handleFileChange(file: File) {
    if (disabled || uploadLock.current) return;
    if (!file.type.startsWith("image/")) {
      setError(txt("m0554"));
      return;
    }
    if (file.size > MAX_SITE_LOGO_BYTES) {
      setError(txt("m0555"));
      return;
    }
    setError("");
    uploadLock.current = true;
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
      uploadLock.current = false;
      setLoading(false);
    }
  }
  async function handleRemove() {
    if (!siteLogoUrl || disabled || uploadLock.current) return;
    uploadLock.current = true;
    setError("");
    setLoading(true);
    try {
      const saved = await deleteSiteLogo();
      onChange(saved);
      setPreviewUrl(null);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      uploadLock.current = false;
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
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Upload.Dragger
            className="admin-file-dropzone w-full"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            multiple
            showUploadList={false}
            disabled={disabled || loading}
            beforeUpload={(file, files) => {
              if (files.length !== 1) {
                setError(txt("uploadLogoSingle"));
              } else {
                void handleFileChange(file);
              }
              return Upload.LIST_IGNORE;
            }}
          >
            <ImagePlusIcon size={24} className="mx-auto mb-2 text-primary" aria-hidden />
            <p className="font-medium">{loading ? txt("m0309") : txt("m0558")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{txt("uploadLogoDrop")}</p>
          </Upload.Dragger>
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
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {localizeAdminNotice(error)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
