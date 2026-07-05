"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content: string;
  className?: string;
  emptyHint?: string;
};

/** 与后端 Python markdown「extra」扩展一致：支持 GFM + 内联 HTML。 */
export function MarkdownContent({ content, className, emptyHint }: MarkdownContentProps) {
  if (!content.trim()) {
    return emptyHint ? <p className="text-sm text-muted-foreground">{emptyHint}</p> : null;
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-a:text-primary",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-img:inline prose-img:max-w-full prose-img:align-middle",
        "[&_p[align=center]]:text-center",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
