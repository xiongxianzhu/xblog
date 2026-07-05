"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, HouseIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useAdminSidebar } from "@/components/admin/admin-sidebar-provider";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { Link as LocaleLink } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  adminNavEntries,
  isNavGroupActive,
  isNavGroupExpanded,
  isNavItemActive,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  onNavigate?: () => void;
  className?: string;
  variant?: "rail" | "drawer";
};

function navLinkClasses({
  active,
  collapsed,
  isDrawer,
  indent,
  flyout,
}: {
  active: boolean;
  collapsed?: boolean;
  isDrawer?: boolean;
  indent?: boolean;
  flyout?: boolean;
}) {
  return cn(
    "group relative flex items-center rounded-[2px] text-sm font-medium transition-colors",
    flyout ? "min-h-9 gap-2 px-2 py-2" : "min-h-10 py-2.5",
    !flyout && collapsed && !isDrawer ? "justify-center px-2" : !flyout ? "gap-3 px-3" : null,
    !flyout && indent && !collapsed && "ml-3 pl-3",
    active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

function NavItemLink({
  item,
  collapsed,
  isDrawer,
  active,
  onNavigate,
  t,
  indent = false,
  flyout = false,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  isDrawer: boolean;
  active: boolean;
  onNavigate?: () => void;
  t: (key: string) => string;
  indent?: boolean;
  flyout?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed && !isDrawer && !flyout ? t(item.labelKey) : undefined}
      onClick={onNavigate}
      className={navLinkClasses({ active, collapsed, isDrawer, indent, flyout })}
    >
      {active ? (
        <span
          className={cn(
            "absolute inset-y-0 w-0.5 rounded-full bg-primary",
            flyout || (collapsed && !isDrawer) ? "left-0.5" : "left-0",
          )}
          aria-hidden
        />
      ) : null}
      <Icon className={cn("shrink-0", indent || flyout ? "size-3.5" : "size-4")} />
      {flyout || !collapsed || isDrawer ? <span className="truncate">{t(item.labelKey)}</span> : null}
    </Link>
  );
}

function NavGroupCollapsedFlyout({
  group,
  pathname,
  onNavigate,
  t,
}: {
  group: AdminNavGroup;
  pathname: string;
  onNavigate?: () => void;
  t: (key: string) => string;
}) {
  const { palette, resolvedMode } = useAdminTheme();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Icon = group.icon;
  const groupActive = isNavGroupActive(pathname, group);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function handleEnter() {
    clearCloseTimer();
    setOpen(true);
  }

  function handleLeave() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  return (
    <div onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t(group.labelKey)}
            aria-expanded={open}
            className={cn(
              "group relative flex min-h-10 w-full items-center justify-center rounded-[2px] px-2 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-0",
              groupActive
                ? "bg-primary/10 text-primary"
                : open
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {groupActive ? (
              <span className="absolute inset-y-0 left-0.5 w-0.5 rounded-full bg-primary" aria-hidden />
            ) : null}
            <Icon className="size-4 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-auto border-none bg-transparent p-0 shadow-none outline-none ring-0 data-[state=closed]:animate-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-150"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div
            data-admin-shell
            data-admin-palette={palette}
            className={cn(
              "admin-sidebar-flyout w-44 overflow-hidden rounded-[2px] p-1.5",
              resolvedMode === "dark" && "dark",
            )}
          >
            <p className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground">{t(group.labelKey)}</p>
            <Separator className="my-1 bg-border/70" />
            <div className="flex flex-col gap-0.5">
              {group.children.map((child) => (
                <NavItemLink
                  key={child.href}
                  item={child}
                  collapsed={false}
                  isDrawer={false}
                  active={isNavItemActive(pathname, child)}
                  onNavigate={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  t={t}
                  flyout
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function NavGroupSection({
  group,
  collapsed,
  isDrawer,
  pathname,
  expanded,
  onToggle,
  onNavigate,
  t,
}: {
  group: AdminNavGroup;
  collapsed: boolean;
  isDrawer: boolean;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  t: (key: string) => string;
}) {
  const Icon = group.icon;
  const groupActive = isNavGroupActive(pathname, group);

  if (collapsed && !isDrawer) {
    return <NavGroupCollapsedFlyout group={group} pathname={pathname} onNavigate={onNavigate} t={t} />;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex min-h-10 w-full items-center gap-3 rounded-[2px] px-3 py-2.5 text-left text-sm font-medium transition-colors",
          groupActive
            ? "bg-primary/5 text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate">{t(group.labelKey)}</span>
        <ChevronDownIcon className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <div className="flex flex-col gap-1 border-l border-border/60 pl-1">
          {group.children.map((child) => (
            <NavItemLink
              key={child.href}
              item={child}
              collapsed={collapsed}
              isDrawer={isDrawer}
              active={isNavItemActive(pathname, child)}
              onNavigate={onNavigate}
              t={t}
              indent
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSidebar({ onNavigate, className, variant = "rail" }: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  const { collapsed: railCollapsed, toggleCollapsed } = useAdminSidebar();
  const isDrawer = variant === "drawer";
  const collapsed = isDrawer ? false : railCollapsed;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const entry of adminNavEntries) {
        if (entry.type === "group" && isNavGroupExpanded(pathname, entry)) {
          next[entry.id] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside
      className={cn(
        "admin-sidebar flex flex-col border-r border-border/70 bg-[hsl(var(--admin-sidebar))]",
        !isDrawer && collapsed && "items-stretch",
        className,
      )}
    >
      <nav
        className={cn("flex flex-1 flex-col gap-1 overflow-y-auto p-2.5", collapsed && !isDrawer && "px-1.5")}
        aria-label="管理后台导航"
      >
        {adminNavEntries.map((entry) => {
          if (entry.type === "group") {
            return (
              <NavGroupSection
                key={entry.id}
                group={entry}
                collapsed={collapsed}
                isDrawer={isDrawer}
                pathname={pathname}
                expanded={expandedGroups[entry.id] ?? isNavGroupExpanded(pathname, entry)}
                onToggle={() => toggleGroup(entry.id)}
                onNavigate={onNavigate}
                t={t}
              />
            );
          }

          return (
            <NavItemLink
              key={entry.href}
              item={entry}
              collapsed={collapsed}
              isDrawer={isDrawer}
              active={isNavItemActive(pathname, entry)}
              onNavigate={onNavigate}
              t={t}
            />
          );
        })}
      </nav>

      <div className={cn("border-t border-border/80 p-2.5", collapsed && !isDrawer && "px-1.5")}>
        <LocaleLink
          href="/"
          title={collapsed && !isDrawer ? t("backToSite") : undefined}
          onClick={onNavigate}
          className={cn(
            "flex min-h-10 items-center rounded-[2px] py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && !isDrawer ? "justify-center px-2" : "gap-2 px-3",
          )}
        >
          <HouseIcon className="size-4 shrink-0" />
          {!collapsed || isDrawer ? <span>{t("backToSite")}</span> : null}
        </LocaleLink>

        {variant === "rail" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "mt-1.5 min-h-10 w-full text-muted-foreground hover:text-foreground",
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
