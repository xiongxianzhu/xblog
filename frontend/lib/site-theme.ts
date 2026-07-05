import { unstable_cache } from "next/cache";

import {
  DEFAULT_SITE_THEME,
  isSitePaletteId,
  type SitePublicTheme,
  type SitePaletteId,
  type SitePublicColorMode,
} from "@/lib/themes";

const API_PREFIX = "/api/v1";

function getServerOrigin(): string {
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function normalizeTheme(raw: Partial<SitePublicTheme> | null | undefined): SitePublicTheme {
  const mode: SitePublicColorMode = raw?.mode === "dark" ? "dark" : "light";
  const palette: SitePaletteId =
    typeof raw?.palette === "string" && isSitePaletteId(raw.palette) ? raw.palette : DEFAULT_SITE_THEME.palette;
  const site_name = typeof raw?.site_name === "string" && raw.site_name.trim() ? raw.site_name.trim() : DEFAULT_SITE_THEME.site_name;
  const site_tagline =
    typeof raw?.site_tagline === "string" ? raw.site_tagline.trim() : DEFAULT_SITE_THEME.site_tagline;
  const site_logo_url =
    typeof raw?.site_logo_url === "string" && raw.site_logo_url.trim() ? raw.site_logo_url.trim() : null;
  const site_icp_number =
    typeof raw?.site_icp_number === "string" && raw.site_icp_number.trim() ? raw.site_icp_number.trim() : null;
  return { mode, palette, site_name, site_tagline, site_logo_url, site_icp_number };
}

async function fetchSiteThemeFromApi(): Promise<SitePublicTheme> {
  const url = new URL(`${API_PREFIX}/public/site-theme`, getServerOrigin()).toString();
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`site-theme ${response.status}`);
    }
    const body = (await response.json()) as Partial<SitePublicTheme> | { code?: number; msg?: string; data?: Partial<SitePublicTheme> };
    const data =
      body && typeof body === "object" && "code" in body && "data" in body
        ? (body as { data: Partial<SitePublicTheme> }).data
        : body;
    return normalizeTheme(data as Partial<SitePublicTheme>);
  } catch {
    return DEFAULT_SITE_THEME;
  }
}

const getPublicSiteThemeCached = unstable_cache(fetchSiteThemeFromApi, ["public-site-theme-v5"], {
  tags: ["site-theme"],
  revalidate: 3600,
});

/** 公开站主题：开发环境每次请求拉取；生产环境走 tag 缓存，保存后由 revalidateTag 刷新。 */
export async function getPublicSiteTheme(): Promise<SitePublicTheme> {
  if (process.env.NODE_ENV === "development") {
    return fetchSiteThemeFromApi();
  }
  return getPublicSiteThemeCached();
}

export const SITE_THEME_CACHE_TAG = "site-theme";
