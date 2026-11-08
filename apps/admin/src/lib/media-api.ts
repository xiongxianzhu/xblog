import { adminText } from "@/lib/admin-messages";
import { fetchAuth } from "@/lib/api";
export type MediaKind = "image" | "audio" | "video";
export type MediaAsset = {
  id: number;
  kind: MediaKind;
  name: string;
  original_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  group_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};
export type MediaGroup = {
  id: number;
  kind: MediaKind;
  name: string;
  count: number;
};
export type MediaGroups = {
  items: MediaGroup[];
  total_count: number;
  ungrouped_count: number;
};
export type MediaList = {
  items: MediaAsset[];
  total: number;
  page: number;
  page_size: number;
};
export const MEDIA_TYPES = {
  image: {
    get label() {
      return adminText("m0115");
    },
    accept: ".jpg,.jpeg,.png,.gif,.webp",
    limit: 20,
    formats: "JPG、PNG、GIF、WebP",
  },
  audio: {
    get label() {
      return adminText("m0116");
    },
    accept: ".mp3,.wav,.ogg,.flac,.m4a",
    limit: 100,
    formats: "MP3、WAV、OGG、FLAC、M4A",
  },
  video: {
    get label() {
      return adminText("m0117");
    },
    accept: ".mp4,.webm",
    limit: 500,
    formats: "MP4、WebM",
  },
} satisfies Record<
  MediaKind,
  {
    label: string;
    accept: string;
    limit: number;
    formats: string;
  }
>;
export function listMedia(
  kind: MediaKind,
  page: number,
  pageSize: number,
  q: string,
  groupId: number | null,
) {
  return fetchAuth<MediaList>("/admin/media", undefined, false, {
    kind,
    page,
    page_size: pageSize,
    q: q.trim() || undefined,
    group_id: groupId ?? undefined,
  });
}
export function listMediaGroups(kind: MediaKind) {
  return fetchAuth<MediaGroups>("/admin/media/groups", undefined, false, {
    kind,
  });
}
export function uploadMedia(file: File, kind: MediaKind, groupId: number | null) {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  if (groupId) body.append("group_id", String(groupId));
  return fetchAuth<MediaAsset>("/admin/media", {
    method: "POST",
    body,
  });
}
export function updateMedia(
  id: number,
  payload: {
    name: string;
    group_id: number | null;
  },
) {
  return fetchAuth<MediaAsset>(`/admin/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export function deleteMedia(id: number) {
  return fetchAuth<{
    message: string;
  }>(`/admin/media/${id}`, {
    method: "DELETE",
  });
}
export function createMediaGroup(kind: MediaKind, name: string) {
  return fetchAuth<MediaGroup>("/admin/media/groups", {
    method: "POST",
    body: JSON.stringify({
      kind,
      name,
    }),
  });
}
export function renameMediaGroup(id: number, name: string) {
  return fetchAuth<MediaGroup>(`/admin/media/groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name,
    }),
  });
}
export function deleteMediaGroup(id: number) {
  return fetchAuth<{
    message: string;
  }>(`/admin/media/groups/${id}`, {
    method: "DELETE",
  });
}
export function formatMediaSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
