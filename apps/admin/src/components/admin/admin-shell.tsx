import { Button, ConfigProvider, Drawer, Dropdown, Layout, Menu } from "antd";
import {
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
import { AdminBackToTopButton } from "@/components/admin/admin-back-to-top-button";
import { AdminLoginSuccessToast } from "@/components/admin/admin-login-success-toast";
import { AdminMenuArrow } from "@/components/admin/admin-menu-arrow";
import { AdminSidebarProvider, useAdminSidebar } from "@/components/admin/admin-sidebar-provider";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { UserAvatar } from "@/components/admin/user-avatar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteBrand } from "@/components/site-brand";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { adminNavEntries, adminNavItems, isNavItemActive } from "@/lib/admin-nav";
import { getHeaderLink, getMe, getPublicSiteThemeClient, logout } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { usePathname, useRouter } from "@/lib/navigation";
import { ADMIN_PALETTES, isAdminPaletteId } from "@/lib/themes";
import { useAdminMessages } from "@/lib/use-admin-messages";

function Shell({ children }: { children: React.ReactNode }) {
  const txt = useAdminMessages();
  const router = useRouter();
  const { mode, palette, setMode, setPalette } = useAdminTheme();
  const path = usePathname();
  const t = useTranslations("admin.nav");
  const tProfile = useTranslations("admin.profile");
  const { collapsed, toggleCollapsed } = useAdminSidebar();
  const [mobile, setMobile] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const { data: me } = useSWR("admin-me", getMe);
  const { data: brand } = useSWR("public-site-theme", getPublicSiteThemeClient);
  const { data: headerLink } = useSWR("admin-header-link", getHeaderLink);
  const activeMenu = adminNavItems.find((item) => isNavItemActive(path, item));
  const currentTitle = activeMenu
    ? t(activeMenu.labelKey)
    : path === "/admin/profile"
      ? tProfile("title")
      : path === "/admin/password"
        ? tProfile("password")
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
      tooltip={{
        arrow: false,
        placement: "right",
        align: {
          offset: [8, 0],
        },
        trigger: ["hover", "focus"],
        classNames: {
          root: "admin-nav-tooltip",
          container: "admin-nav-hint",
        },
      }}
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
      <AdminBackToTopButton />
      <Layout.Header className="admin-app-header">
        <div className="admin-header-brand">
          <Button
            className="lg:hidden"
            aria-label={txt("m0351")}
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
            open={themeMenuOpen}
            onOpenChange={setThemeMenuOpen}
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              selectable: true,
              selectedKeys: [mode, palette],
              items: [
                {
                  key: "light",
                  label: txt("m0352"),
                  icon: <Sun size={16} />,
                },
                {
                  key: "dark",
                  label: txt("m0353"),
                  icon: <Moon size={16} />,
                },
                {
                  key: "system",
                  label: txt("m0354"),
                  icon: <Monitor size={16} />,
                },
                {
                  type: "divider",
                },
                {
                  key: "palettes",
                  label: txt("m0355"),
                  children: ADMIN_PALETTES.map((item) => ({
                    key: item.id,
                    label: item.label,
                  })),
                },
              ],
              onClick: ({ key }) => {
                setThemeMenuOpen(false);
                if (key === "light" || key === "dark" || key === "system") setMode(key);
                else if (isAdminPaletteId(key)) setPalette(key);
              },
            }}
          >
            <Button
              type="text"
              className="admin-header-icon"
              aria-label={txt("m0356")}
              aria-haspopup="menu"
              aria-expanded={themeMenuOpen}
              title={txt("m0356")}
              icon={<Palette size={18} />}
            >
              <AdminMenuArrow open={themeMenuOpen} />
            </Button>
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
            classNames={{
              root: "admin-account-menu",
            }}
            open={accountMenuOpen}
            onOpenChange={setAccountMenuOpen}
            placement="bottomRight"
            trigger={["click"]}
            align={{
              offset: [0, 1],
            }}
            menu={{
              items: [
                {
                  key: "profile",
                  label: tProfile("title"),
                  icon: <UserRound size={16} />,
                },
                {
                  key: "password",
                  label: tProfile("password"),
                  icon: <KeyRound size={16} />,
                },
                {
                  type: "divider",
                },
                {
                  key: "logout",
                  label: txt("m0163"),
                  icon: <LogOut size={16} />,
                },
              ],
              onClick: async ({ key }) => {
                setAccountMenuOpen(false);
                if (key === "logout") {
                  try {
                    await logout();
                    await mutate(() => true, undefined, {
                      revalidate: false,
                    });
                    router.replace("/admin");
                  } catch (error) {
                    toast.error(getAdminErrorMessage(error));
                  }
                } else router.push(`/admin/${key}`);
              },
            }}
          >
            <div className="admin-account-trigger">
              <Button
                type="text"
                className="admin-account-button"
                aria-label={txt("m0357")}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
              >
                <UserAvatar username={me?.username || txt("m0358")} avatarUrl={me?.avatar_url} size="sm" />
                <span className="admin-account-copy">
                  <strong>{me?.nickname || me?.username || txt("m0358")}</strong>
                  <small>{tProfile("administrator")}</small>
                </span>
                <AdminMenuArrow open={accountMenuOpen} />
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
          <ConfigProvider
            wave={{
              disabled: true,
            }}
          >
            <Button
              className="admin-sidebar-toggle"
              aria-label={collapsed ? txt("m0359") : txt("m0360")}
              icon={collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              onClick={toggleCollapsed}
            />
          </ConfigProvider>
        </Layout.Sider>
        <Layout.Content className="admin-app-content">{children}</Layout.Content>
      </Layout>
      <Drawer
        title={
          <SiteBrand
            admin
            siteName={brand?.site_name || "xblog"}
            siteLogoUrl={brand?.site_logo_url}
            showTagline={false}
            className="max-w-44"
            onNavigate={() => setMobile(false)}
          />
        }
        size={288}
        placement="left"
        closeIcon={<X size={18} />}
        open={mobile}
        onClose={() => setMobile(false)}
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        {navigation}
      </Drawer>
    </Layout>
  );
}
export function AdminShell({ children }: { children: React.ReactNode }) {
  useAdminMessages();
  return (
    <AdminSidebarProvider>
      <Shell>{children}</Shell>
    </AdminSidebarProvider>
  );
}
