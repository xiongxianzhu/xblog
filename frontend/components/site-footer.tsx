"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-border/70 bg-card/50">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-lg font-semibold">xblog</p>
            <p className="text-sm text-muted-foreground">自托管 · Markdown · 开源</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/blog" className="transition-colors hover:text-primary">
              博客
            </Link>
            <Link href="/rss.xml" className="transition-colors hover:text-primary">
              RSS
            </Link>
            <Link href="/sitemap.xml" className="transition-colors hover:text-primary">
              Sitemap
            </Link>
          </div>
        </div>
        <Separator />
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          © {new Date().getFullYear()} xblog · MIT License
        </p>
      </div>
    </footer>
  );
}
