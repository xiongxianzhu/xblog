import { listPosts } from "@/lib/api";

export async function GET() {
  const posts = await listPosts(1, 100);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  <title>xblog</title>
  <link>${siteUrl}</link>
  <description>个人博客 RSS</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
