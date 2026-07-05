export const revalidate = 3600;

import { ArrowRightIcon, PenLineIcon, RssIcon, SearchIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { listPosts } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const posts = await listPosts(1, 5);

  return (
    <div className="page-enter">
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="flex max-w-3xl flex-col gap-6">
            <p className="text-xs uppercase tracking-[0.35em] text-primary">{t("eyebrow")}</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              {t("titleLine1")}
              <br />
              <span className="text-primary">{t("titleLine2")}</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{t("description")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/blog">
                  {t("enterBlog")}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/search">
                  <SearchIcon data-icon="inline-start" />
                  {t("search")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-3xl font-semibold">{t("latestPosts")}</h2>
            <p className="text-sm text-muted-foreground">{t("latestPostsHint")}</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/blog">
              {t("viewAll")}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        {posts.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <div className="flex flex-col gap-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <section className="site-glass-bar border-t">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <Link href="/admin" className="site-glass-panel group flex flex-col gap-2 p-5 transition-colors">
            <PenLineIcon className="size-5 text-primary" />
            <p className="font-medium">{t("cardAdminTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("cardAdminDescription")}</p>
          </Link>
          <Link href="/rss.xml" className="site-glass-panel group flex flex-col gap-2 p-5 transition-colors">
            <RssIcon className="size-5 text-primary" />
            <p className="font-medium">{t("cardRssTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("cardRssDescription")}</p>
          </Link>
          <Link href="/about" className="site-glass-panel group flex flex-col gap-2 p-5 transition-colors">
            <span className="font-serif text-lg text-primary">{t("cardAboutTitle")}</span>
            <p className="font-medium">{t("cardAboutSubtitle")}</p>
            <p className="text-sm text-muted-foreground">{t("cardAboutDescription")}</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
