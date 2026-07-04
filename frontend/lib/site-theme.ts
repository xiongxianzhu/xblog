import { unstable_cache } from "next/cache";

import { DEFAULT_SITE_THEME, type SitePublicTheme, type SitePaletteId, type SitePublicColorMode } from "@/lib/themes";

const API_PREFIX = "/api/v1";

function getServerOrigin(): string {
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function normalizeTheme(raw: Partial<SitePublicTheme> | null | undefined): SitePublicTheme {
  const mode: SitePublicColorMode = raw?.mode === "dark" ? "dark" : "light";
  const palette: SitePaletteId =
    raw?.palette === "forest" || raw?.palette === "slate" || raw?.palette === "ink" || raw?.palette === "editorial"
      ? raw.palette
      : DEFAULT_SITE_THEME.palette;
  return { mode, palette };
}

async function fetchSiteThemeFromApi(): Promise<SitePublicTheme> {
  const url = new URL(`${API_PREFIX}/public/site-theme`, getServerOrigin()).toString();
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`site-theme ${response.status}`);
    }
    const data = (await response.json()) as Partial<SitePublicTheme>;
    return normalizeTheme(data);
  } catch {
    return DEFAULT_SITE_THEME;
  }
}

const getPublicSiteThemeCached = unstable_cache(fetchSiteThemeFromApi, ["public-site-theme-v1"], {
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
