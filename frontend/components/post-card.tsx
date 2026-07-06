import { ArrowUpRightIcon, PinIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { resolvePublicAssetUrl } from "@/lib/public-asset-url";
import type { PostSummary } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

function PostTags({ tags }: { tags: PostSummary["tags"] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Link key={tag.slug} href={`/tags/${tag.slug}`}>
          <Badge variant="outline" className="font-normal">
            {tag.name}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

export function PostCard({ post }: { post: PostSummary }) {
  const coverSrc = resolvePublicAssetUrl(post.cover_url);

  return (
    <Card
      className={cn(
        "site-glass-panel group overflow-hidden transition-all duration-300",
        post.is_pinned && "post-card--pinned",
      )}
    >
      {post.is_pinned ? (
        <>
          <div className="post-card-pin-banner" aria-label="置顶推荐">
            <PinIcon className="post-card-pin-icon size-4 shrink-0" aria-hidden strokeWidth={2.25} />
            <span>置顶推荐</span>
            <span className="post-card-pin-banner-shine" aria-hidden />
          </div>
          <div className="post-card-pin-fold" aria-hidden />
        </>
      ) : null}

      <div className={cn("flex min-h-0", coverSrc && "flex-row", post.is_pinned && "post-card-pin-body")}>
        {coverSrc ? (
          <Link
            href={`/blog/${post.slug}`}
            className={cn(
              "relative shrink-0 overflow-hidden border-r border-border/50",
              post.is_pinned
                ? "post-card-pin-cover w-[8.5rem] sm:w-52 lg:w-60"
                : "w-[7.5rem] sm:w-44 lg:w-48",
            )}
            aria-label={post.title}
          >
            <div className="aspect-[4/3] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverSrc}
                alt=""
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Link>
        ) : null}

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-3",
            post.is_pinned ? "post-card-pin-content p-5 sm:p-6" : "p-4 sm:p-5",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3">
              {post.published_at ? (
                <time className="text-xs tracking-wide text-muted-foreground">{formatDate(post.published_at)}</time>
              ) : null}
              <h2
                className={cn(
                  "font-serif font-semibold leading-snug tracking-tight",
                  post.is_pinned ? "post-card-pin-title text-xl sm:text-2xl" : "text-lg sm:text-xl",
                )}
              >
                <Link href={`/blog/${post.slug}`} className="transition-colors group-hover:text-primary">
                  {post.title}
                </Link>
              </h2>
              <PostTags tags={post.tags} />
            </div>
            <ArrowUpRightIcon
              className={cn(
                "mt-1 shrink-0 text-muted-foreground transition-all",
                post.is_pinned ? "size-5 opacity-70 group-hover:opacity-100 group-hover:text-primary" : "size-4 opacity-0 group-hover:opacity-100",
              )}
            />
          </div>

          {post.excerpt ? (
            <p
              className={cn(
                "line-clamp-2 leading-relaxed text-muted-foreground sm:line-clamp-3",
                post.is_pinned ? "post-card-pin-excerpt text-sm sm:text-[0.9375rem]" : "text-sm",
              )}
            >
              {post.excerpt}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
