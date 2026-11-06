import { ArrowUpRightIcon, PinIcon, SparklesIcon } from "lucide-react";

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
      <div className={cn("flex min-h-0", coverSrc && "flex-row", post.is_pinned && "post-card-pin-body")}>
        {coverSrc ? (
          <Link
            href={`/blog/${post.slug}`}
            className={cn(
              "relative aspect-[4/3] shrink-0 self-stretch overflow-hidden border-r border-border/50",
              post.is_pinned ? "post-card-pin-cover" : "w-[7.5rem] sm:w-44 lg:w-48",
            )}
            aria-label={post.title}
          >
            {/* biome-ignore lint/performance/noImgElement: Images may use administrator-provided external URLs without a fixed host allowlist. */}
            <img
              src={coverSrc}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
            />
          </Link>
        ) : null}

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-3",
            post.is_pinned ? "post-card-pin-content" : "p-4 sm:p-5",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3">
              <div className="post-card-meta flex flex-wrap items-center gap-x-4 gap-y-2">
                {post.is_pinned ? (
                  <span className="post-card-pin-label">
                    <PinIcon className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
                    置顶推荐
                  </span>
                ) : null}
                {post.published_at ? (
                  <time dateTime={post.published_at} className="text-xs tracking-wide text-muted-foreground">
                    {formatDate(post.published_at)}
                  </time>
                ) : null}
              </div>
              <h2
                className={cn(
                  "font-serif font-semibold leading-snug tracking-tight",
                  post.is_pinned ? "post-card-pin-title text-2xl sm:text-3xl" : "text-lg sm:text-xl",
                )}
              >
                <Link href={`/blog/${post.slug}`} className="transition-colors group-hover:text-primary">
                  {post.title}
                  {post.is_pinned ? (
                    <SparklesIcon className="post-card-pin-sparkles" aria-hidden="true" strokeWidth={1.5} />
                  ) : null}
                </Link>
              </h2>
              {!post.is_pinned ? <PostTags tags={post.tags} /> : null}
            </div>
            <ArrowUpRightIcon
              className={cn(
                "mt-1 shrink-0 text-muted-foreground transition-all",
                post.is_pinned
                  ? "size-5 opacity-70 group-hover:opacity-100 group-hover:text-primary"
                  : "size-4 opacity-0 group-hover:opacity-100",
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
          {post.is_pinned ? <PostTags tags={post.tags} /> : null}
        </div>
      </div>
    </Card>
  );
}
