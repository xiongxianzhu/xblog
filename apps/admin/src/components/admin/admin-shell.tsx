import { Button, Drawer, Dropdown, Layout, Menu } from "antd";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  KeyRound,
  LogOut,
  Menu as MenuIcon,
  Monitor,
  Moon,
  Palette,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useTranslations } from "use-intl";
import { AdminLoginSuccessToast } from "@/components/admin/admin-login-success-toast";
import { AdminSidebarProvider, useAdminSidebar } from "@/components/admin/admin-sidebar-provider";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { UserAvatar } from "@/components/admin/user-avatar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteBrand } from "@/components/site-brand";
import { adminNavEntries, adminNavItems, isNavItemActive } from "@/lib/admin-nav";
import { getHeaderLink, getMe, getPublicSiteThemeClient, logout } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { usePathname, useRouter } from "@/lib/navigation";
import { ADMIN_PALETTES, isAdminPaletteId } from "@/lib/themes";

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { mode, palette, setMode, setPalette } = useAdminTheme();
  const path = usePathname();
  const t = useTranslations("admin.nav");
  const { collapsed, toggleCollapsed } = useAdminSidebar();
  const [mobile, setMobile] = useState(false);
  const { data: me } = useSWR("admin-me", getMe);
  const { data: brand } = useSWR("public-site-theme", getPublicSiteThemeClient);
  const { data: headerLink } = useSWR("admin-header-link", getHeaderLink);
  const activeMenu = adminNavItems.find((item) => isNavItemActive(path, item));
  const currentTitle = activeMenu
    ? t(activeMenu.labelKey)
    : path === "/admin/profile"
      ? "个人资料"
      : path === "/admin/password"
        ? "修改密码"
        : "";
  const items = adminNavEntries.map((entry) => ({
    key: entry.type === "group" ? entry.id : entry.href,
    icon: <entry.icon size={17} />,
    label: t(entry.labelKey),
    ...(entry.type === "group"
      ? {
          popupClassName: "admin-nav-popup",
          popupOffset: [0, 0],
          children: entry.children.map((child) => ({
            key: child.href,
            label: t(child.labelKey),
            icon: <child.icon size={16} />,
          })),
        }
      : {}),
  }));
  const navigation = (
    <Menu
      mode="inline"
      expandIcon={({ isOpen }) => (
        <ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
      )}
      selectedKeys={adminNavItems.filter((item) => isNavItemActive(path, item)).map((item) => item.href)}
      defaultOpenKeys={["ai", "extended-pages", "logs"]}
      items={items}
      onClick={({ key }) => {
        router.push(key);
        setMobile(false);
      }}
    />
  );
  return (
    <Layout className="admin-app-layout">
      <AdminLoginSuccessToast />
      <Layout.Header className="admin-app-header">
        <div className="admin-header-brand">
          <Button
            className="lg:hidden"
            aria-label="打开菜单"
            icon={<MenuIcon size={18} />}
            onClick={() => setMobile(true)}
          />
          <SiteBrand
            admin
            siteName={brand?.site_name || "xblog"}
            siteLogoUrl={brand?.site_logo_url}
            showTagline={false}
            className="admin-header-site-brand"
            titleClassName="admin-header-site-name"
          />
          {currentTitle ? (
            <>
              <span className="admin-header-divider" aria-hidden="true" />
              <span className="admin-header-current" title={currentTitle}>
                {currentTitle}
              </span>
            </>
          ) : null}
        </div>
        <div className="admin-header-actions">
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              selectable: true,
              selectedKeys: [mode, palette],
              items: [
                { key: "light", label: "浅色", icon: <Sun size={16} /> },
                { key: "dark", label: "深色", icon: <Moon size={16} /> },
                { key: "system", label: "跟随系统", icon: <Monitor size={16} /> },
                { type: "divider" },
                {
                  key: "palettes",
                  label: "主题配色",
                  children: ADMIN_PALETTES.map((item) => ({ key: item.id, label: item.label })),
                },
              ],
              onClick: ({ key }) => {
                if (key === "light" || key === "dark" || key === "system") setMode(key);
                else if (isAdminPaletteId(key)) setPalette(key);
              },
            }}
          >
            <Button
              type="text"
              className="admin-header-icon"
              aria-label="后台主题"
              title="后台主题"
              icon={<Palette size={18} />}
            />
          </Dropdown>
          <LocaleSwitcher compact className="admin-header-language" />
          {headerLink?.enabled ? (
            <a
              href={headerLink.url}
              className="admin-site-entry"
              aria-label={headerLink.name}
              title={headerLink.name}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} />
              <span>{headerLink.name}</span>
            </a>
          ) : null}
          <Dropdown
            classNames={{ root: "admin-account-menu" }}
            placement="bottomRight"
            trigger={["click"]}
            align={{ offset: [0, 1] }}
            menu={{
              items: [
                { key: "profile", label: "个人资料", icon: <UserRound size={16} /> },
                { key: "password", label: "修改密码", icon: <KeyRound size={16} /> },
                { type: "divider" },
                { key: "logout", label: "退出登录", icon: <LogOut size={16} /> },
              ],
              onClick: async ({ key }) => {
                if (key === "logout") {
                  try {
                    await logout();
                    await mutate(() => true, undefined, { revalidate: false });
                    router.replace("/admin");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "退出失败，请重试");
                  }
                } else router.push(`/admin/${key}`);
              },
            }}
          >
            <div className="admin-account-trigger">
              <Button type="text" className="admin-account-button" aria-label="账户菜单">
                <UserAvatar username={me?.username || "账户"} avatarUrl={me?.avatar_url} size="sm" />
                <span className="admin-account-copy">
                  <strong>{me?.nickname || me?.username || "账户"}</strong>
                  <small>管理员</small>
                </span>
                <ChevronDown size={14} />
              </Button>
            </div>
          </Dropdown>
        </div>
      </Layout.Header>
      <Layout>
        <Layout.Sider
          className="admin-app-sider"
          width={240}
          collapsedWidth={64}
          collapsed={collapsed}
          theme="light"
        >
          <div className="admin-sidebar-navigation">{navigation}</div>
          <Button
            className="admin-sidebar-toggle"
            aria-label={collapsed ? "展开导航" : "收起导航"}
            icon={collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            onClick={toggleCollapsed}
          />
        </Layout.Sider>
        <Layout.Content className="admin-app-content">{children}</Layout.Content>
      </Layout>
      <Drawer
        title={null}
        size={288}
        placement="left"
        closeIcon={<X size={18} />}
        open={mobile}
        onClose={() => setMobile(false)}
        styles={{ body: { padding: 0 } }}
      >
        {navigation}
      </Drawer>
    </Layout>
  );
}
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminSidebarProvider>
      <Shell>{children}</Shell>
    </AdminSidebarProvider>
  );
}
