import { adminText } from "@/lib/admin-messages";
/** Public-site links keep their own origin and never inherit the admin locale. */
export function getPublicPostUrl(slug: string, siteBaseUrl: string): string {
  const configured = siteBaseUrl.trim();
  const fallback = new URL(window.location.origin);
  if (import.meta.env.DEV) fallback.port = "10241";
  const base = new URL(configured || fallback.href);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
    throw new Error(adminText("m0766"));
  }
  base.search = "";
  base.hash = "";
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/blog/${encodeURIComponent(slug)}`;
  return base.href;
}
