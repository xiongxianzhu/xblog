export function enhanceProseTables(root: HTMLElement) {
  const wraps: HTMLDivElement[] = [];

  root.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.classList.contains("prose-table-wrap")) return;

    const wrap = document.createElement("div");
    wrap.className = "prose-table-wrap";
    table.parentNode?.insertBefore(wrap, table);
    wrap.appendChild(table);
    wraps.push(wrap);
  });

  return () => {
    wraps.forEach((wrap) => {
      const table = wrap.querySelector("table");
      if (table && wrap.parentNode) {
        wrap.parentNode.insertBefore(table, wrap);
        wrap.remove();
      }
    });
  };
}
