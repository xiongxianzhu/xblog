"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, HouseIcon } from "lucide-react";

import { useAdminSidebar } from "@/components/admin/admin-sidebar-provider";
import { Button } from "@/components/ui/button";
import { adminNavItems, isNavActive } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  onNavigate?: () => void;
  className?: string;
  /** 移动端抽屉内始终展开，不显示折叠按钮 */
  variant?: "rail" | "drawer";
};

export function AdminSidebar({ onNavigate, className, variant = "rail" }: AdminSidebarProps) {
  const pathname = usePathname();
  const { collapsed: railCollapsed, toggleCollapsed } = useAdminSidebar();
  const isDrawer = variant === "drawer";
  const collapsed = isDrawer ? false : railCollapsed;

  return (
    <aside
      className={cn(
        "admin-sidebar flex flex-col border-r border-border/70 bg-[hsl(var(--admin-sidebar))]",
        !isDrawer && collapsed && "items-stretch",
        className,
      )}
    >
      <nav
        className={cn("flex flex-1 flex-col gap-0.5 overflow-y-auto p-2", collapsed && !isDrawer && "px-1.5")}
        aria-label="管理后台导航"
      >
        {adminNavItems.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed && !isDrawer ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center rounded-[2px] py-2 text-sm font-medium transition-colors",
                collapsed && !isDrawer ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {active ? (
                <span
                  className={cn(
                    "absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary",
                    collapsed && !isDrawer ? "left-0.5" : "left-0",
                  )}
                  aria-hidden
                />
              ) : null}
              <Icon className="size-4 shrink-0" />
              {!collapsed || isDrawer ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-border/80 p-2", collapsed && !isDrawer && "px-1.5")}>
        <Link
          href="/"
          title={collapsed && !isDrawer ? "返回站点" : undefined}
          onClick={onNavigate}
          className={cn(
            "flex items-center rounded-[2px] py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && !isDrawer ? "justify-center px-2" : "gap-2 px-3",
          )}
        >
          <HouseIcon className="size-4 shrink-0" />
          {!collapsed || isDrawer ? <span>返回站点</span> : null}
        </Link>

        {variant === "rail" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "mt-1 w-full text-muted-foreground hover:text-foreground",
              collapsed ? "justify-center px-2" : "justify-start gap-2 px-3",
            )}
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          >
            {collapsed ? <ChevronRightIcon className="size-4" /> : <ChevronLeftIcon className="size-4" />}
            {!collapsed ? <span className="text-sm">收起菜单</span> : null}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
