/** 公开页资源 URL：规范化空白、协议相对地址与缺省协议的域名链接。 */
export function resolvePublicAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^[\w.-]+\.[\w.-]+/.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/** 后台预览：相对路径走当前站点 origin，便于本地上传封面即时预览。 */
export function resolveAdminAssetPreviewUrl(url: string | null | undefined): string | null {
  const resolved = resolvePublicAssetUrl(url);
  if (!resolved) return null;
  if (typeof window !== "undefined" && resolved.startsWith("/")) {
    return `${window.location.origin}${resolved}`;
  }
  return resolved;
}

/** 本地上传的文章封面 URL（/api/v1/uploads/covers/…）。 */
export function isManagedPostCoverUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim().startsWith("/api/v1/uploads/covers/"));
}
