import type { MetadataRoute } from "next";
import { listPublishedPostsForSitemap, listTags } from "@/lib/api";
import { resolveSiteUrl, siteUrl } from "@/lib/seo";
import { getPublicSiteTheme } from "@/lib/site-theme";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [theme, posts, tags] = await Promise.all([
    getPublicSiteTheme(),
    listPublishedPostsForSitemap(),
    listTags(),
  ]);
  const base = resolveSiteUrl(theme.site_base_url);
  const routes: MetadataRoute.Sitemap = ["/", "/blog", "/tags", "/about", "/projects", "/links"].flatMap(
    (path) => ["zh-CN", "zh-TW", "en"].map((locale) => ({ url: siteUrl(base, path, locale) })),
  );
  for (const post of posts) routes.push({ url: siteUrl(base, `/blog/${encodeURIComponent(post.slug)}`) });
  for (const tag of tags) {
    if (tag.post_count > 0)
      for (const locale of ["zh-CN", "zh-TW", "en"])
        routes.push({ url: siteUrl(base, `/tags/${encodeURIComponent(tag.slug)}`, locale) });
  }
  if (routes.length > 50000) throw new Error("Split sitemap: more than 50,000 URLs");
  return routes;
}
