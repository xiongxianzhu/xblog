import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/seo";
import { getPublicSiteTheme } from "@/lib/site-theme";

export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const theme = await getPublicSiteTheme();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/v1/uploads/"],
      disallow: ["/admin", "/api/", "/zh-CN/admin", "/zh-TW/admin", "/en/admin"],
    },
    sitemap: `${resolveSiteUrl(theme.site_base_url)}/sitemap.xml`,
  };
}
