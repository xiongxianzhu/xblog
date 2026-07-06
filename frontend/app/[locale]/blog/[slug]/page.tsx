export const revalidate = 3600;

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ArticleCover } from "@/components/article-cover";
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
    return {
      title: post.title,
      description: post.excerpt ?? post.title,
      openGraph: {
        title: post.title,
        description: post.excerpt ?? post.title,
        ...(post.cover_url ? { images: [{ url: post.cover_url, alt: post.title }] } : {}),
      },
    };
  } catch {
    return { title: t("postNotFound") };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");

  const siteTheme = await getPublicSiteTheme();
  let post;
  try {
    post = await getPost(slug);
  } catch {
    notFound();
  }

  const { html: contentHtml, headings } = prepareArticleContent(post.content_html);
  const hasToc = headings.length > 0;
  const coverSrc = resolvePublicAssetUrl(post.cover_url);

  return (
    <article className="page-enter article-layout mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
      <PageViewTracker path={`/blog/${slug}`} />

      <div className={cn("grid gap-8 lg:gap-10", hasToc && "xl:grid-cols-[minmax(0,1fr)_11rem]")}>
        <div className="min-w-0 flex flex-col gap-8">
          <header className="flex flex-col gap-4 border-b border-border/70 pb-8">
            {post.published_at ? (
              <time className="text-xs uppercase tracking-[0.25em] text-primary">
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
            {post.excerpt ? <p className="text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p> : null}
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
