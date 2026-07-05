"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  KeyRoundIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAdminTheme, useAdminThemeLabels } from "@/components/admin/theme-provider";
import { UserAvatar } from "@/components/admin/user-avatar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteBrand } from "@/components/site-brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMe, getPublicSiteThemeClient, logout } from "@/lib/api";
import { DEFAULT_SITE_THEME } from "@/lib/themes";
import { mutate } from "swr";
import { cn } from "@/lib/utils";
import { ADMIN_PALETTES, type AdminPaletteId, type ColorMode } from "@/lib/themes";

export function AdminHeader() {
  const router = useRouter();
  const tFeedback = useTranslations("admin.feedback");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: user } = useSWR("admin-me", getMe);
  const { data: siteTheme } = useSWR("public-site-theme-brand", getPublicSiteThemeClient);
  const { mode, palette, resolvedMode, setMode, setPalette } = useAdminTheme();
  const { modeLabel, paletteLabel } = useAdminThemeLabels();
  const userMenuItemClass = "min-h-10 py-2.5";
  const displayName = user?.nickname?.trim() || user?.username || "加载中";
  const showUsernameHint = Boolean(user?.nickname?.trim() && user.username);
  const siteName = siteTheme?.site_name ?? DEFAULT_SITE_THEME.site_name;
  const siteTagline = siteTheme?.site_tagline ?? DEFAULT_SITE_THEME.site_tagline;
  const siteLogoUrl = siteTheme?.site_logo_url;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      await mutate("admin-me", undefined, { revalidate: false });
      toast.success(tFeedback("logoutSuccess"));
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      toast.error(tFeedback("logoutFailed"), {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="admin-topbar fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 px-4 lg:px-6">
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="lg:hidden" aria-label="打开菜单">
            <MenuIcon className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent
          data-admin-shell
          data-admin-palette={palette}
          className={cn(
            "admin-sidebar-drawer fixed left-0 top-0 flex h-[100dvh] max-w-xs translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 border-r border-border/70 bg-[hsl(var(--admin-sidebar))] p-0 text-foreground shadow-none",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100",
            resolvedMode === "dark" && "dark",
          )}
        >
          <DialogHeader className="border-b border-border/70 bg-[hsl(var(--admin-sidebar))] px-4 py-3 text-left">
            <DialogTitle className="sr-only">{siteName}</DialogTitle>
            <SiteBrand
              admin
              siteName={siteName}
              siteTagline={siteTagline}
              siteLogoUrl={siteLogoUrl}
              onNavigate={() => setMobileOpen(false)}
            />
          </DialogHeader>
          <AdminSidebar
            variant="drawer"
            className="min-h-0 flex-1 border-0 bg-transparent"
            onNavigate={() => setMobileOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <SiteBrand
        admin
        siteName={siteName}
        siteTagline={siteTagline}
        siteLogoUrl={siteLogoUrl}
        className="shrink-0"
      />

      <div className="flex-1" />

      <LocaleSwitcher compact className="hidden md:flex" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 max-w-[12rem] gap-2 rounded-full px-1.5 sm:pr-3"
            aria-label="用户菜单"
          >
            <UserAvatar username={user?.username ?? ".."} avatarUrl={user?.avatar_url} size="md" />
            <span className="hidden min-w-0 truncate text-sm font-medium sm:inline">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 p-1.5">
          <DropdownMenuLabel className="px-2.5 py-2 font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{displayName}</span>
              {showUsernameHint ? (
                <span className="truncate text-xs text-muted-foreground">
                  @{user?.username} · 管理员
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">管理员</span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={userMenuItemClass} onSelect={() => router.push("/admin/profile")}>
            <UserIcon />
            个人资料
          </DropdownMenuItem>
          <DropdownMenuItem className={userMenuItemClass} onSelect={() => router.push("/admin/settings")}>
            <SettingsIcon />
            设置
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={userMenuItemClass}>
              <PaletteIcon />
              后台主题
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52 p-1.5">
              <DropdownMenuLabel className="px-2.5 py-2 text-xs font-normal text-muted-foreground">
                {paletteLabel} · {modeLabel}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuLabel className="px-2.5 py-1.5 text-xs text-muted-foreground">配色</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={palette} onValueChange={(value) => setPalette(value as AdminPaletteId)}>
                {ADMIN_PALETTES.map((item) => (
                  <DropdownMenuRadioItem key={item.id} value={item.id} className={userMenuItemClass}>
                    {item.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuLabel className="px-2.5 py-1.5 text-xs text-muted-foreground">亮度</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={mode} onValueChange={(value) => setMode(value as ColorMode)}>
                <DropdownMenuRadioItem value="light" className={userMenuItemClass}>
                  <SunIcon />
                  浅色
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className={userMenuItemClass}>
                  <MoonIcon />
                  深色
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className={userMenuItemClass}>
                  <MonitorIcon />
                  跟随系统
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem className={userMenuItemClass} onSelect={() => router.push("/admin/password")}>
            <KeyRoundIcon />
            修改密码
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem
            className={cn(userMenuItemClass, "text-destructive focus:text-destructive")}
            disabled={loggingOut}
            onSelect={() => {
              void handleLogout();
            }}
          >
            <LogOutIcon />
            {loggingOut ? "退出中…" : "退出登录"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
