import { Avatar, Button, Modal } from "antd";
import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/feedback";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import { useAdminMessages } from "@/lib/use-admin-messages";
export function UserAvatar({
  username,
  avatarUrl,
  size = "md",
  className,
  preview = false,
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  preview?: boolean;
}) {
  const txt = useAdminMessages();
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = resolveAdminAssetPreviewUrl(avatarUrl);
  const canPreview = preview && src && failedUrl !== src;
  async function download() {
    if (!src || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const extensions: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
        "image/avif": ".avif",
      };
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${username.replace(/[\\/:*?"<>|]/g, "_")}-avatar${extensions[blob.type] ?? ""}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      toast.error(txt("m0731"), {
        description: txt("m0732"),
      });
    } finally {
      setDownloading(false);
    }
  }
  const avatar = (
    <Avatar
      src={src}
      size={
        {
          sm: 32,
          md: 36,
          lg: 56,
          xl: 96,
        }[size]
      }
      className={className}
      onError={() => {
        setFailedUrl(src);
        return true;
      }}
    >
      {username.slice(0, 2).toUpperCase()}
    </Avatar>
  );
  if (!canPreview) return avatar;
  return (
    <>
      <button
        type="button"
        aria-label={txt("m0733", {
          p0: username,
        })}
        title={txt("m0734")}
        className="inline-flex shrink-0 cursor-zoom-in rounded-full border-0 bg-transparent p-0 align-middle"
        onClick={() => setOpen(true)}
      >
        {avatar}
      </button>
      {open ? (
        <Modal
          open
          centered
          title={txt("m0735", {
            p0: username,
          })}
          onCancel={() => setOpen(false)}
          width={640}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button href={src} target="_blank" rel="noopener noreferrer" icon={<ExternalLink size={16} />}>
                {txt("m0736")}
              </Button>
              <Button
                type="primary"
                loading={downloading}
                icon={<Download size={16} />}
                onClick={() => void download()}
              >
                {txt("m0737")}
              </Button>
            </div>
          }
        >
          <img
            src={src}
            alt={txt("m0738", {
              p0: username,
            })}
            className="mx-auto block max-h-[65dvh] max-w-full object-contain"
          />
        </Modal>
      ) : null}
    </>
  );
}
