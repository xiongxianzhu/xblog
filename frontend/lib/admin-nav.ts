import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  BriefcaseIcon,
  FileTextIcon,
  KeyRoundIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LinkIcon,
  ScrollTextIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

export type AdminNavItem = {
  type: "item";
  href: string;
  labelKey: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
};

export type AdminNavGroup = {
  type: "group";
  id: string;
  labelKey: string;
  icon: LucideIcon;
  children: AdminNavItem[];
};

export type AdminNavEntry = AdminNavItem | AdminNavGroup;

export const adminNavEntries: AdminNavEntry[] = [
  { type: "item", href: "/admin/dashboard", labelKey: "dashboard", icon: LayoutDashboardIcon, match: "exact" },
  { type: "item", href: "/admin/users", labelKey: "users", icon: UsersIcon, match: "exact" },
  { type: "item", href: "/admin/posts", labelKey: "posts", icon: FileTextIcon, match: "prefix" },
  {
    type: "group",
    id: "extended-pages",
    labelKey: "extendedPages",
    icon: LayersIcon,
    children: [
      { type: "item", href: "/admin/about", labelKey: "about", icon: UserRoundIcon, match: "exact" },
      { type: "item", href: "/admin/projects", labelKey: "projects", icon: BriefcaseIcon, match: "exact" },
    ],
  },
  { type: "item", href: "/admin/links", labelKey: "links", icon: LinkIcon, match: "exact" },
  {
    type: "group",
    id: "ai",
    labelKey: "ai",
    icon: BotIcon,
    children: [
      { type: "item", href: "/admin/ai/models", labelKey: "aiModels", icon: BotIcon, match: "prefix" },
      { type: "item", href: "/admin/ai/skills", labelKey: "skills", icon: SparklesIcon, match: "prefix" },
    ],
  },
  { type: "item", href: "/admin/settings", labelKey: "settings", icon: SettingsIcon, match: "exact" },
  {
    type: "group",
    id: "logs",
    labelKey: "logs",
    icon: ScrollTextIcon,
    children: [
      { type: "item", href: "/admin/logs/operations", labelKey: "operationLogs", icon: ScrollTextIcon, match: "prefix" },
      { type: "item", href: "/admin/logs/login", labelKey: "loginLogs", icon: KeyRoundIcon, match: "prefix" },
    ],
  },
];

/** @deprecated 使用 adminNavEntries */
export const adminNavItems: AdminNavItem[] = adminNavEntries.flatMap((entry) =>
  entry.type === "group" ? entry.children : [entry],
);

export function isNavItemActive(pathname: string, item: AdminNavItem): boolean {
  if (item.match === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

/** @deprecated 使用 isNavItemActive */
export const isNavActive = isNavItemActive;

export function isNavGroupActive(pathname: string, group: AdminNavGroup): boolean {
  return group.children.some((child) => isNavItemActive(pathname, child));
}

export function isNavGroupExpanded(pathname: string, group: AdminNavGroup): boolean {
  return isNavGroupActive(pathname, group);
}
