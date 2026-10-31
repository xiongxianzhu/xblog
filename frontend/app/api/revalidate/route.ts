import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { locales } from "@/i18n/routing";

import { SITE_THEME_CACHE_TAG } from "@/lib/site-theme";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    secret?: string;
    paths?: string[];
    layout?: boolean;
    tags?: string[];
  };
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret || body.secret !== secret) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const paths = [...new Set((body.paths ?? ["/", "/blog"]).flatMap((path) => {
    // Locale-prefixed URLs are the actual routes behind next-intl rewrites.
    if (locales.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`)) ||
        path === "/rss.xml" || path === "/sitemap.xml") {
      return [path];
    }
    return [path, ...locales.map((locale) => `/${locale}${path === "/" ? "" : path}`)];
  }))];
  const layout = body.layout === true;
  const tags = body.tags ?? (layout ? [SITE_THEME_CACHE_TAG] : []);

  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  for (const path of paths) {
    revalidatePath(path, layout ? "layout" : undefined);
  }

  return NextResponse.json({ revalidated: true, paths, layout, tags });
}
