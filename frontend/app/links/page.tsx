export const revalidate = 3600;

import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { PageViewTracker } from "@/components/page-view-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listLinks } from "@/lib/api";

export const metadata = {
  title: "友链",
  description: "友情链接",
};

export default async function LinksPage() {
  const links = await listLinks();

  return (
    <PageShell title="友链" description="志同道合的朋友们。">
      <PageViewTracker path="/links" />
      {links.length === 0 ? (
        <EmptyState title="暂无友链" description="可在后台添加友链。" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((link) => (
            <Card key={link.id} className="group border-border/80 transition-colors hover:border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link href={link.url} target="_blank" rel="noopener noreferrer" className="transition-colors group-hover:text-primary">
                    {link.name}
                  </Link>
                  <ExternalLinkIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="truncate text-sm text-muted-foreground">{link.url}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
