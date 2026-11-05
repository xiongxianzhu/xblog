import { Modal, Upload } from "antd";

import { CameraIcon, DownloadIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";

import { UserAvatar } from "@/components/admin/user-avatar";
import { Button } from "@/components/ui/button";
import { deleteAvatar, uploadAvatar } from "@/lib/api";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type AvatarEditorProps = {
  username: string;
  avatarUrl?: string | null;
  size?: "md" | "lg" | "xl";
  layout?: "horizontal" | "stacked";
};

export function AvatarEditor({ username, avatarUrl, size = "lg", layout = "horizontal" }: AvatarEditorProps) {
  const { mutate } = useSWRConfig();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(avatarUrl ?? null);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentUrl(avatarUrl ?? null);
  }, [avatarUrl]);

  async function refreshUserCaches(nextAvatarUrl: string | null) {
    await Promise.all([mutate("admin-me"), mutate("admin-users")]);
    setCurrentUrl(nextAvatarUrl);
  }

  async function handleFileChange(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("图片不能超过 5MB");
      return;
    }

    setError("");
    setLoading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const result = await uploadAvatar(file);
      await refreshUserCaches(result.avatar_url);
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
    if (!currentUrl) return;
    setError("");
    setLoading(true);
    try {
      await deleteAvatar();
      await refreshUserCaches(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  const displayUrl = previewUrl ?? currentUrl;

  return (
    <div
      className={
        layout === "stacked"
          ? "flex flex-col items-center gap-3 text-center"
          : "flex flex-col gap-4 sm:flex-row sm:items-center"
      }
    >
      <div className="relative inline-flex shrink-0 self-center">
        <button
          type="button"
          disabled={!displayUrl || loading}
          onClick={() => setPreviewOpen(true)}
          aria-label="放大预览头像"
          title={displayUrl ? "放大预览头像" : undefined}
          className="rounded-full enabled:cursor-zoom-in"
        >
          <UserAvatar username={username} avatarUrl={displayUrl} size={size} />
        </button>
        <div className="absolute -right-1 bottom-0">
          <Upload
            accept="image/jpeg,image/png,image/webp,image/gif"
            showUploadList={false}
            disabled={loading}
            beforeUpload={(file) => {
              void handleFileChange(file);
              return false;
            }}
          >
            <button
              type="button"
              disabled={loading}
              aria-label="更换头像"
              title="更换头像"
              className="inline-flex size-9 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm enabled:cursor-pointer"
            >
              {loading ? <Loader2Icon className="size-4 animate-spin" /> : <CameraIcon className="size-4" />}
            </button>
          </Upload>
        </div>
      </div>
      {displayUrl && (
        <Modal
          title="头像预览"
          centered
          open={previewOpen}
          onCancel={() => setPreviewOpen(false)}
          footer={
            <a className="inline-flex items-center gap-2" href={displayUrl} download>
              <DownloadIcon size={16} />
              下载原图
            </a>
          }
        >
          <img
            src={displayUrl}
            alt={`${username} 的头像`}
            className="mx-auto max-h-[65vh] max-w-full object-contain"
          />
        </Modal>
      )}
      <div className={layout === "stacked" ? "flex flex-col items-center gap-2" : "flex flex-col gap-2"}>
        <div className="flex items-center gap-2">
          {currentUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => void handleRemove()}
            >
              <Trash2Icon data-icon="inline-start" />
              移除
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">支持 JPG、PNG、WebP、GIF，最大 5MB。</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
