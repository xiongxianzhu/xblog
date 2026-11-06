type HeadingNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HeadingNode[];
};

function textContent(node: HeadingNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textContent).join("");
}

/** Match the public site's h2–h4 anchors, including headings parsed from raw HTML. */
export function rehypeHeadingIds() {
  return (tree: HeadingNode) => {
    const usedIds = new Set<string>();
    let counter = 0;

    function visit(node: HeadingNode) {
      if (node.type === "element" && /^h[2-4]$/.test(node.tagName ?? "")) {
        const text = textContent(node).trim();
        if (text) {
          node.properties ??= {};
          const properties = node.properties;
          if (typeof properties.id === "string" && properties.id) {
            usedIds.add(properties.id);
          } else {
            const index = counter++;
            let id =
              text
                .toLowerCase()
                .normalize("NFKD")
                .replace(/[\s\u3000]+/g, "-")
                .replace(/[^\p{L}\p{N}-]/gu, "")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 60) || `section-${index + 1}`;
            while (usedIds.has(id)) {
              id = `${id}-${counter}`;
              counter += 1;
            }
            usedIds.add(id);
            properties.id = id;
          }
        }
      }
      node.children?.forEach(visit);
    }

    visit(tree);
  };
}
