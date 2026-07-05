import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  BriefcaseIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LinkIcon,
  ScrollTextIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin/dashboard", labelKey: "dashboard", icon: LayoutDashboardIcon, match: "exact" },
  { href: "/admin/users", labelKey: "users", icon: UsersIcon, match: "exact" },
  { href: "/admin/posts", labelKey: "posts", icon: FileTextIcon, match: "prefix" },
  { href: "/admin/about", labelKey: "about", icon: UserRoundIcon, match: "exact" },
  { href: "/admin/projects", labelKey: "projects", icon: BriefcaseIcon, match: "exact" },
  { href: "/admin/links", labelKey: "links", icon: LinkIcon, match: "exact" },
  { href: "/admin/logs", labelKey: "logs", icon: ScrollTextIcon, match: "exact" },
  { href: "/admin/ai/models", labelKey: "aiModels", icon: BotIcon, match: "prefix" },
  { href: "/admin/ai/skills", labelKey: "skills", icon: SparklesIcon, match: "prefix" },
  { href: "/admin/settings", labelKey: "settings", icon: SettingsIcon, match: "exact" },
];

export function isNavActive(pathname: string, item: AdminNavItem): boolean {
  if (item.match === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}
