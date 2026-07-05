import { deleteFriendLinkLogo, deletePostCover } from "@/lib/api";
import { isManagedFriendLinkLogoUrl, isManagedPostCoverUrl } from "@/lib/public-asset-url";

function isUnsavedManagedUpload(current: string | null | undefined, saved: string | null | undefined): boolean {
  const cur = current?.trim() ?? "";
  const sav = saved?.trim() ?? "";
  if (!cur || cur === sav) return false;
  return isManagedPostCoverUrl(cur) || isManagedFriendLinkLogoUrl(cur);
}

/** 丢弃未保存的本地上传封面（静默失败）。 */
export async function discardManagedPostCover(
  current: string | null | undefined,
  saved: string | null | undefined,
): Promise<void> {
  const cur = current?.trim() ?? "";
  if (!isUnsavedManagedUpload(cur, saved) || !isManagedPostCoverUrl(cur)) return;
  try {
    await deletePostCover(cur);
  } catch {
    // 页面卸载或取消时尽力清理，失败不阻断 UI
  }
}

/** 丢弃未保存的本地上传友链 LOGO（静默失败）。 */
export async function discardManagedFriendLinkLogo(
  current: string | null | undefined,
  saved: string | null | undefined,
): Promise<void> {
  const cur = current?.trim() ?? "";
  if (!isUnsavedManagedUpload(cur, saved) || !isManagedFriendLinkLogoUrl(cur)) return;
  try {
    await deleteFriendLinkLogo(cur);
  } catch {
    // 页面卸载或取消时尽力清理，失败不阻断 UI
  }
}
