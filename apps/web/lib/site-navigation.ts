const defaultNavItems = [
  { href: "/blog", labelKey: "blog" },
  { href: "/tags", labelKey: "tags" },
  { href: "/about", labelKey: "about" },
  { href: "/projects", labelKey: "projects" },
  { href: "/links", labelKey: "links" },
  { href: "/search", labelKey: "search" },
] as const;

export type SiteNavItem = (typeof defaultNavItems)[number];

export function getSiteNavItems(navOrder?: string[]): SiteNavItem[] {
  const keys = new Set([...(navOrder ?? []), ...defaultNavItems.map((item) => item.labelKey)]);
  return Array.from(keys).flatMap((key) => defaultNavItems.filter((item) => item.labelKey === key));
}
