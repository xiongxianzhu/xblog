"use client";

import { useLayoutEffect, useState } from "react";

/** 公开站根 shell（SiteThemeShell），用于 Portal 继承主题 CSS 变量 */
export function useSiteShellElement() {
  const [shell, setShell] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setShell(document.querySelector<HTMLElement>("[data-site-shell]"));
  }, []);

  return shell;
}

/** Select 下拉挂到 site shell 时的面板样式 */
export const siteSelectContentClass = "site-select-content";

export const siteSelectItemClass = "site-select-item";
