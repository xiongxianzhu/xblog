export type ArticleHeading = {
  id: string;
  text: string;
  level: number;
};

function slugifyHeading(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\s\u3000]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return slug || `section-${index + 1}`;
}

/** 为 h2–h4 注入 id，并提取目录项（服务端安全）。 */
export function prepareArticleContent(html: string): { html: string; headings: ArticleHeading[] } {
  const headings: ArticleHeading[] = [];
  const usedIds = new Set<string>();
  let counter = 0;

  const processed = html.replace(
    /<h([2-4])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (full, levelStr, attrs = "", inner) => {
      const level = Number(levelStr);
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text) return full;

      const existingId = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
      if (existingId) {
        headings.push({ id: existingId, text, level });
        usedIds.add(existingId);
        return full;
      }

      let id = slugifyHeading(text, counter++);
      while (usedIds.has(id)) {
        id = `${id}-${counter}`;
        counter += 1;
      }
      usedIds.add(id);
      headings.push({ id, text, level });

      const cleanAttrs = attrs.trim();
      const attrPart = cleanAttrs ? ` ${cleanAttrs}` : "";
      return `<h${level}${attrPart} id="${id}">${inner}</h${level}>`;
    },
  );

  return { html: processed, headings };
}
