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
    for (const wrap of wraps) {
      if (!wrap.isConnected) continue;

      const table = wrap.querySelector("table");
      const parent = wrap.parentNode;
      if (!table || !parent || table.parentElement !== wrap) continue;

      try {
        parent.insertBefore(table, wrap);
        wrap.remove();
      } catch {
        // React 可能已替换该子树，忽略即可。
      }
    }
  };
}
