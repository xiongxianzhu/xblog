import type { Metadata } from "next";
import { getPublicSiteTheme } from "@/lib/site-theme";

export function resolveSiteUrl(configured: string, fallback = process.env.NEXT_PUBLIC_SITE_URL): string {
  for (const candidate of [configured, fallback]) {
    if (!candidate?.trim()) continue;
    try {
      const url = new URL(candidate.trim());
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) continue;
      url.search = "";
      url.hash = "";
      return url.toString().replace(/\/$/, "");
    } catch {
      /* Try the deployment fallback. */
    }
  }
  return "http://localhost:10241";
}

export function siteUrl(base: string, path = "/", locale = "zh-CN"): string {
  const prefix = locale === "zh-CN" ? "" : `/${locale}`;
  return `${base}${prefix}${path === "/" ? (prefix ? "" : "/") : path}`;
}

export async function pageSeo(path: string, locale: string): Promise<Metadata> {
  const theme = await getPublicSiteTheme();
  const base = resolveSiteUrl(theme.site_base_url);
  return {
    alternates: {
      canonical: siteUrl(base, path, locale),
      languages: {
        "zh-CN": siteUrl(base, path),
        "zh-TW": siteUrl(base, path, "zh-TW"),
        en: siteUrl(base, path, "en"),
        "x-default": siteUrl(base, path),
      },
    },
  };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function xmlText(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char] ?? char,
  );
}
