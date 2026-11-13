import { listPostsForFeed } from "@/lib/api";
import { resolveSiteUrl, xmlText } from "@/lib/seo";
import { getPublicSiteTheme } from "@/lib/site-theme";

export async function GET() {
  const [posts, siteTheme] = await Promise.all([listPostsForFeed(100), getPublicSiteTheme()]);
  const siteUrl = resolveSiteUrl(siteTheme.site_base_url);
  const channelTitle = siteTheme.site_name;
  const channelDescription = siteTheme.site_tagline || "个人博客 RSS";

  const items = posts
    .map((post) => {
      const pubDate = post.published_at
        ? new Date(post.published_at).toUTCString()
        : new Date().toUTCString();
      return `<item>
  <title>${xmlText(post.title)}</title>
  <link>${xmlText(`${siteUrl}/blog/${encodeURIComponent(post.slug)}`)}</link>
  <guid>${xmlText(`${siteUrl}/blog/${encodeURIComponent(post.slug)}`)}</guid>
  <pubDate>${pubDate}</pubDate>
  <description>${xmlText(post.excerpt ?? post.title)}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${xmlText(channelTitle)}</title>
  <link>${xmlText(siteUrl)}</link>
  <description>${xmlText(channelDescription)}</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
