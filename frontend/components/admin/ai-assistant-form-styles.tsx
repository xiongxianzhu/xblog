"use client";

import { type ComponentProps } from "react";

import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenuContent,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useAdminShellElement } from "@/lib/admin-shell-portal";
import { cn } from "@/lib/utils";

/** 后台浮层 / 下拉面板：细边框 + 主题 popover 色 */
export const adminPopoverPanelClass =
  "overflow-hidden rounded-[2px] border border-primary/25 bg-popover text-popover-foreground shadow-md";

/** Portal 到 body 时的透明外壳：2px 圆角、不锁滚动条 */
export const adminDropdownContentClass =
  "w-auto max-h-none overflow-hidden rounded-[2px] border-0 bg-transparent p-0 shadow-none";

/** 后台表单控件：细边框 + 聚焦略加深 */
export const adminBorderlessControlClass =
  "rounded-[2px] border border-primary/25 bg-muted/30 shadow-none transition-[border-color]";

export const adminBorderlessFocusClass =
  "outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/40 data-[state=open]:border-primary/40";

/** 后台按钮：2px 圆角、无阴影扁平风 */
export const adminFlatButtonClass =
  "rounded-[2px] shadow-none hover:shadow-none active:shadow-none focus-visible:shadow-none";

/** @deprecated 使用 adminBorderlessControlClass */
export const aiAssistantControlClass = adminBorderlessControlClass;

/** @deprecated 使用 adminBorderlessFocusClass */
export const aiAssistantFieldFocusClass = adminBorderlessFocusClass;

export const aiAssistantModelSelectTriggerClass = cn(
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
  "h-8 max-w-[min(100%,14rem)] bg-transparent px-2 text-xs",
);

export const aiAssistantSelectContentClass = adminPopoverPanelClass;

export const aiAssistantSelectItemClass =
  "rounded-[2px] text-sm focus:bg-accent focus:text-accent-foreground data-[state=checked]:bg-accent/80";

export { useAdminShellElement } from "@/lib/admin-shell-portal";

type AdminShellPanelProps = {
  palette: string;
  resolvedMode: "light" | "dark";
  className?: string;
  children: React.ReactNode;
};

/** 挂到 Portal 内，继承后台主题 CSS 变量 */
export function AdminShellPanel({ palette, resolvedMode, className, children }: AdminShellPanelProps) {
  return (
    <div
      data-admin-shell
      data-admin-palette={palette}
      className={cn(adminPopoverPanelClass, resolvedMode === "dark" && "dark", className)}
    >
      {children}
    </div>
  );
}

/** @deprecated Radix Select 不支持 modal={false}，请优先用 DropdownMenu；后台已用 CSS 兜底滚动条锁定 */
export const AdminSelect = Select;

export function AiAssistantSelectContent({ className, ...props }: ComponentProps<typeof SelectContent>) {
  const shell = useAdminShellElement();

  return (
    <SelectContent
      {...props}
      container={shell}
      className={cn(aiAssistantSelectContentClass, className)}
    />
  );
}

export function AiAssistantSelectItem({ className, ...props }: ComponentProps<typeof SelectItem>) {
  return <SelectItem {...props} className={cn(aiAssistantSelectItemClass, className)} />;
}

export function AdminDropdownMenuContent({ className, ...props }: ComponentProps<typeof DropdownMenuContent>) {
  const shell = useAdminShellElement();

  return (
    <DropdownMenuContent
      {...props}
      container={shell}
      className={cn(adminDropdownContentClass, className)}
    />
  );
}

export function AdminDropdownMenuSubContent({ className, ...props }: ComponentProps<typeof DropdownMenuSubContent>) {
  return <DropdownMenuSubContent {...props} className={cn(adminDropdownContentClass, className)} />;
}
