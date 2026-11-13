export const revalidate = 3600;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ArticleCopyright } from "@/components/article-copyright";
import { ArticleCover } from "@/components/article-cover";
import { ArticleShare } from "@/components/article-share";
import { ArticleToc } from "@/components/article-toc";
import { GiscusComments } from "@/components/giscus";
import { PageViewTracker } from "@/components/page-view-tracker";
import { PostNavigation } from "@/components/post-navigation";
import { ProseHtml } from "@/components/prose-html";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { getPost } from "@/lib/api";
import { prepareArticleContent } from "@/lib/article-headings";
import { resolvePublicAssetUrl } from "@/lib/public-asset-url";
import { jsonLd, resolveSiteUrl, siteUrl } from "@/lib/seo";
import { getPublicSiteTheme } from "@/lib/site-theme";
import { cn, formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  try {
    const post = await getPost(slug);
    const theme = await getPublicSiteTheme();
    const base = resolveSiteUrl(theme.site_base_url);
    const url = siteUrl(base, `/blog/${encodeURIComponent(post.slug)}`);
    const cover = resolvePublicAssetUrl(post.cover_url);
    const image = cover ? new URL(cover, `${base}/`).href : undefined;
    return {
      alternates: { canonical: url },
      title: post.title,
      description: post.excerpt ?? post.title,
      openGraph: {
        type: "article",
        url,
        siteName: theme.site_name,
        publishedTime: post.published_at ?? undefined,
        title: post.title,
        description: post.excerpt ?? post.title,
        ...(image ? { images: [{ url: image, alt: post.title }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: post.title,
        description: post.excerpt ?? post.title,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return { title: t("postNotFound"), robots: { index: false, follow: false } };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");

  const siteTheme = await getPublicSiteTheme();
  let post: Awaited<ReturnType<typeof getPost>>;
  try {
    post = await getPost(slug);
  } catch {
    notFound();
  }

  const { html: contentHtml, headings } = prepareArticleContent(post.content_html);
  const hasToc = headings.length > 0;
  const coverSrc = resolvePublicAssetUrl(post.cover_url);
  const base = resolveSiteUrl(siteTheme.site_base_url);
  const canonical = siteUrl(base, `/blog/${encodeURIComponent(post.slug)}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${canonical}#article`,
        url: canonical,
        mainEntityOfPage: canonical,
        headline: post.title,
        description: post.excerpt ?? post.title,
        ...(post.published_at ? { datePublished: post.published_at } : {}),
        ...(coverSrc ? { image: new URL(coverSrc, `${base}/`).href } : {}),
        keywords: post.tags.map((tag) => tag.name),
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: siteTheme.site_name, item: siteUrl(base) },
          { "@type": "ListItem", position: 2, name: t("title"), item: siteUrl(base, "/blog") },
          { "@type": "ListItem", position: 3, name: post.title, item: canonical },
        ],
      },
    ],
  };

  return (
    <article className="page-enter article-layout mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: jsonLd escapes < to prevent script termination by article content. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <PageViewTracker path={`/blog/${slug}`} />

      <div className={cn("grid gap-8 lg:gap-10", hasToc && "xl:grid-cols-[minmax(0,1fr)_15rem]")}>
        <div className="min-w-0 flex flex-col gap-8">
          <header className="flex flex-col gap-4 border-b border-border/70 pb-8">
            {post.published_at ? (
              <time dateTime={post.published_at} className="text-xs uppercase tracking-[0.25em] text-primary">
                {formatDate(post.published_at)}
              </time>
            ) : null}
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link key={tag.slug} href={`/tags/${tag.slug}`}>
                    <Badge variant="outline">{tag.name}</Badge>
                  </Link>
                ))}
              </div>
            ) : null}
          </header>

          {coverSrc ? <ArticleCover src={coverSrc} alt={post.title} priority /> : null}

          {hasToc ? (
            <details className="site-glass-panel group px-4 py-3 xl:hidden">
              <summary className="cursor-pointer list-none text-sm font-medium [&::-webkit-details-marker]:hidden">
                {t("toc")}
              </summary>
              <ArticleToc headings={headings} title={t("toc")} hideTitle className="mt-3" />
            </details>
          ) : null}

          <div className="site-glass-panel article-body-panel px-5 py-8 sm:px-8 sm:py-10">
            <ProseHtml html={contentHtml} className="article-prose" colorMode={siteTheme.mode} />
          </div>

          {siteTheme.article_share_enabled ? <ArticleShare title={post.title} /> : null}

          <ArticleCopyright
            enabled={siteTheme.copyright_enabled}
            content={siteTheme.copyright_content}
            title={t("copyrightTitle")}
          />

          <PostNavigation
            previousPost={post.previous_post}
            nextPost={post.next_post}
            previousLabel={t("postNavPrevious")}
            nextLabel={t("postNavNext")}
            ariaLabel={t("postNavAria")}
          />

          <section className="site-glass-panel flex flex-col gap-4 px-5 py-8 sm:px-8">
            <h2 className="font-serif text-2xl font-semibold">{t("comments")}</h2>
            <GiscusComments theme={siteTheme.mode} />
          </section>
        </div>

        {hasToc ? (
          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <ArticleToc
                headings={headings}
                title={t("toc")}
                className="site-glass-panel max-h-[calc(100vh-7rem)] px-4 py-5"
              />
            </div>
          </aside>
        ) : null}
      </div>
    </article>
  );
}
