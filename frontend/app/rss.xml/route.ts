import { listPosts } from "@/lib/api";
import { getPublicSiteTheme } from "@/lib/site-theme";

export async function GET() {
  const [posts, siteTheme] = await Promise.all([listPosts(1, 100), getPublicSiteTheme()]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const channelTitle = siteTheme.site_name;
  const channelDescription = siteTheme.site_tagline || "个人博客 RSS";

  const items = posts
    .map((post) => {
      const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : new Date().toUTCString();
      return `<item>
  <title><![CDATA[${post.title}]]></title>
  <link>${siteUrl}/blog/${post.slug}</link>
  <guid>${siteUrl}/blog/${post.slug}</guid>
  <pubDate>${pubDate}</pubDate>
  <description><![CDATA[${post.excerpt ?? post.title}]]></description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title><![CDATA[${channelTitle}]]></title>
  <link>${siteUrl}</link>
  <description><![CDATA[${channelDescription}]]></description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
