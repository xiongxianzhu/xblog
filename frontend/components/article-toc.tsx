import { cn } from "@/lib/utils";
import type { ArticleHeading } from "@/lib/article-headings";

type ArticleTocProps = {
  headings: ArticleHeading[];
  title: string;
  className?: string;
  hideTitle?: boolean;
};

export function ArticleToc({ headings, title, className, hideTitle = false }: ArticleTocProps) {
  if (headings.length === 0) return null;

  return (
    <nav aria-label={title} className={cn("flex flex-col gap-3", className)}>
      {hideTitle ? null : (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{title}</p>
      )}
      <ul className="flex max-h-[calc(100vh-8rem)] flex-col gap-1 overflow-y-auto border-l border-border/60 pl-3">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={cn(
              heading.level === 3 && "pl-2",
              heading.level === 4 && "pl-4",
            )}
          >
            <a
              href={`#${heading.id}`}
              className="block py-0.5 text-sm leading-snug text-muted-foreground transition-colors hover:text-primary"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
