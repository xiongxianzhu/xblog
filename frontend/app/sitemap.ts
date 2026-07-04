import type { MetadataRoute } from "next";

import { listPosts } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const posts = await listPosts(1, 200);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/blog`, lastModified: new Date() },
    { url: `${siteUrl}/about`, lastModified: new Date() },
    { url: `${siteUrl}/projects`, lastModified: new Date() },
    { url: `${siteUrl}/links`, lastModified: new Date() },
    { url: `${siteUrl}/search`, lastModified: new Date() },
  ];

  const postRoutes = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.published_at ? new Date(post.published_at) : new Date(),
  }));

  return [...staticRoutes, ...postRoutes];
}
