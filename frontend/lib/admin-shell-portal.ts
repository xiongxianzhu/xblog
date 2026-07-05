"use client";

import { useLayoutEffect, useState } from "react";

/** 后台根 shell（ThemeProvider），用于 Portal 继承主题 CSS 变量 */
export function useAdminShellElement() {
  const [shell, setShell] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setShell(document.querySelector<HTMLElement>("[data-admin-shell]"));
  }, []);

  return shell;
}

/** Select 下拉挂到 admin shell 时的面板样式 */
export const adminSelectContentClass =
  "overflow-hidden rounded-[2px] border border-primary/25 bg-popover text-popover-foreground shadow-md";
