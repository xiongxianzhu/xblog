"use client";

import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { ImagePlusIcon, Trash2Icon } from "lucide-react";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate } = useSWRConfig();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(avatarUrl ?? null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentUrl(avatarUrl ?? null);
  }, [avatarUrl]);

  async function refreshUserCaches(nextAvatarUrl: string | null) {
    await Promise.all([
      mutate("admin-me"),
      mutate("admin-users"),
    ]);
    setCurrentUrl(nextAvatarUrl);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

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
      <UserAvatar username={username} avatarUrl={displayUrl} size={size} />
      <div className={layout === "stacked" ? "flex flex-col items-center gap-2" : "flex flex-col gap-2"}>
        <div className={`flex flex-wrap gap-2 ${layout === "stacked" ? "justify-center" : ""}`}>
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => inputRef.current?.click()}>
            <ImagePlusIcon data-icon="inline-start" />
            {loading ? "处理中…" : "上传头像"}
          </Button>
          {currentUrl ? (
            <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => void handleRemove()}>
              <Trash2Icon data-icon="inline-start" />
              移除
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">支持 JPG、PNG、WebP、GIF，最大 5MB。</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => void handleFileChange(e)} />
      </div>
    </div>
  );
}
