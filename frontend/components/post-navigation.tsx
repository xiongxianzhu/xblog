import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { PostNeighbor } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type PostNavigationProps = {
  previousPost: PostNeighbor | null;
  nextPost: PostNeighbor | null;
  previousLabel: string;
  nextLabel: string;
  ariaLabel: string;
};

function PostNavigationLink({
  post,
  direction,
  label,
}: {
  post: PostNeighbor;
  direction: "previous" | "next";
  label: string;
}) {
  const isPrevious = direction === "previous";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "group/post-nav flex min-h-[5.5rem] flex-col justify-center gap-2 px-5 py-4 transition-colors hover:bg-primary/5 sm:px-6",
        isPrevious ? "items-start text-left" : "items-end text-right sm:col-start-2",
      )}
    >
      <span className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-primary">
        {isPrevious ? <ChevronLeftIcon className="size-3.5" aria-hidden /> : null}
        {label}
        {!isPrevious ? <ChevronRightIcon className="size-3.5" aria-hidden /> : null}
      </span>
      <span className="line-clamp-2 font-serif text-lg font-semibold leading-snug tracking-tight transition-colors group-hover/post-nav:text-primary">
        {post.title}
      </span>
      {post.published_at ? (
        <time className="text-xs text-muted-foreground">{formatDate(post.published_at)}</time>
      ) : null}
    </Link>
  );
}

export function PostNavigation({
  previousPost,
  nextPost,
  previousLabel,
  nextLabel,
  ariaLabel,
}: PostNavigationProps) {
  if (!previousPost && !nextPost) {
    return null;
  }

  return (
    <nav aria-label={ariaLabel} className="site-glass-panel grid overflow-hidden sm:grid-cols-2">
      {previousPost ? (
        <PostNavigationLink post={previousPost} direction="previous" label={previousLabel} />
      ) : (
        <div className="hidden min-h-[5.5rem] sm:block" aria-hidden />
      )}
      {nextPost ? (
        <PostNavigationLink post={nextPost} direction="next" label={nextLabel} />
      ) : (
        <div className="hidden min-h-[5.5rem] sm:block" aria-hidden />
      )}
    </nav>
  );
}
