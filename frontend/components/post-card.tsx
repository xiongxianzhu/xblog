import { ArrowUpRightIcon } from "lucide-react";

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
    <Card className="site-glass-panel group overflow-hidden transition-colors">
      <div className={cn("flex min-h-0", coverSrc && "flex-row")}>
        {coverSrc ? (
          <Link
            href={`/blog/${post.slug}`}
            className="relative w-[7.5rem] shrink-0 overflow-hidden border-r border-border/50 sm:w-44 lg:w-48"
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

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              {post.published_at ? (
                <time className="text-xs tracking-wide text-muted-foreground">{formatDate(post.published_at)}</time>
              ) : null}
              <h2 className="font-serif text-lg font-semibold leading-snug tracking-tight sm:text-xl">
                <Link href={`/blog/${post.slug}`} className="transition-colors group-hover:text-primary">
                  {post.title}
                </Link>
              </h2>
              <PostTags tags={post.tags} />
            </div>
            <ArrowUpRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          {post.excerpt ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-3">{post.excerpt}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
