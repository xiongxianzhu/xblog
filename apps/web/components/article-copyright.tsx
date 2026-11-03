import ReactMarkdown from "react-markdown";

type Props = { enabled: boolean; content: string; title: string };
export function ArticleCopyright({ enabled, content, title }: Props) {
  if (!enabled || !content.trim()) return null;
  return (
    <section className="site-glass-panel px-5 py-6 sm:px-8" aria-labelledby="article-copyright-title">
      <h2 id="article-copyright-title" className="mb-3 font-serif text-lg font-semibold">
        {title}
      </h2>
      <div className="prose prose-sm max-w-none break-words dark:prose-invert">
        <ReactMarkdown
          skipHtml
          allowedElements={["p", "a", "strong", "em", "br", "ul", "ol", "li", "blockquote", "code"]}
          unwrapDisallowed
        >
          {content}
        </ReactMarkdown>
      </div>
    </section>
  );
}
