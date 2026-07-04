import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { PostSummary } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Card className="group overflow-hidden border-border/80 hover:border-primary/30 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {post.published_at ? (
            <time className="text-xs tracking-wide text-muted-foreground">{formatDate(post.published_at)}</time>
          ) : null}
          <CardTitle className="text-xl sm:text-2xl">
            <Link href={`/blog/${post.slug}`} className="transition-colors group-hover:text-primary">
              {post.title}
            </Link>
          </CardTitle>
        </div>
        <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </CardHeader>
      {post.excerpt ? (
        <CardContent>
          <p className="line-clamp-3 leading-relaxed text-muted-foreground">{post.excerpt}</p>
        </CardContent>
      ) : null}
      {post.tags.length > 0 ? (
        <CardFooter className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Link key={tag.slug} href={`/tags/${tag.slug}`}>
              <Badge variant="outline">{tag.name}</Badge>
            </Link>
          ))}
        </CardFooter>
      ) : null}
    </Card>
  );
}
