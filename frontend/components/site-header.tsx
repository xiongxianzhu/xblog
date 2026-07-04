"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/blog", label: "博客" },
  { href: "/about", label: "关于" },
  { href: "/projects", label: "项目" },
  { href: "/links", label: "友链" },
  { href: "/search", label: "搜索" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex flex-col gap-0.5">
          <span className="font-serif text-xl font-semibold tracking-wide text-foreground transition-colors group-hover:text-primary">
            xblog
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:block">
            Ink &amp; Paper
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/admin"
            className="ml-1 rounded-md border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            管理
          </Link>
        </nav>
      </div>
    </header>
  );
}
