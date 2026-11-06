import { Button, Modal } from "antd";
import { Download } from "lucide-react";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { formatMediaSize, type MediaAsset } from "@/lib/media-api";
import { formatDateTime } from "@/lib/utils";

export function MediaPreview({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) {
  const url = new URL(asset.url, window.location.origin).href;
  return (
    <Modal
      open
      centered
      title={asset.name}
      width={900}
      onCancel={onClose}
      footer={
        <Button href={`/api/v1/admin/media/${asset.id}/download`} icon={<Download size={16} />}>
          下载原文件
        </Button>
      }
    >
      <div className="my-4 flex min-h-40 items-center justify-center rounded border bg-muted/30 p-3">
        {asset.kind === "image" ? (
          <img src={asset.url} alt={asset.name} className="max-h-[60dvh] max-w-full object-contain" />
        ) : asset.kind === "audio" ? (
          // biome-ignore lint/a11y/useMediaCaption: This previews original user uploads; captions are not supplied by the media library.
          <audio
            key={asset.id}
            src={asset.url}
            controls
            preload="metadata"
            className="w-full"
            aria-label={asset.name}
          />
        ) : (
          // biome-ignore lint/a11y/useMediaCaption: This previews original user uploads; captions are not supplied by the media library.
          <video
            key={asset.id}
            src={asset.url}
            controls
            playsInline
            preload="metadata"
            className="max-h-[60dvh] w-full"
            aria-label={asset.name}
          />
        )}
      </div>
      {asset.kind !== "image" ? (
        <p className="text-xs text-muted-foreground">若浏览器不支持此文件的编码，可下载原文件后播放。</p>
      ) : null}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span>{asset.mime_type}</span>
        <span>{formatMediaSize(asset.size_bytes)}</span>
        <span>{formatDateTime(asset.created_at)}</span>
      </div>
      <p className="mb-0 mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <span className="min-w-0 break-all">{url}</span>
        <CopyFieldButton label="素材链接" value={url} />
      </p>
    </Modal>
  );
}
