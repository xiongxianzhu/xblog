import type { LucideIcon } from "lucide-react";
import {
  BriefcaseIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "仪表盘", icon: LayoutDashboardIcon, match: "exact" },
  { href: "/admin/users", label: "用户", icon: UsersIcon, match: "exact" },
  { href: "/admin/posts", label: "文章", icon: FileTextIcon, match: "prefix" },
  { href: "/admin/projects", label: "作品集", icon: BriefcaseIcon, match: "exact" },
  { href: "/admin/logs", label: "日志", icon: ScrollTextIcon, match: "exact" },
  { href: "/admin/settings", label: "设置", icon: SettingsIcon, match: "exact" },
];

export function isNavActive(pathname: string, item: AdminNavItem): boolean {
  if (item.match === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}
