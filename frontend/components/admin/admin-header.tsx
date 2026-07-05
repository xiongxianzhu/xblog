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
  const { mode, palette, setMode, setPalette } = useAdminTheme();
  const { modeLabel, paletteLabel } = useAdminThemeLabels();
  const userMenuItemClass = "min-h-10 py-2.5";

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
        <DialogContent className="fixed left-0 top-0 h-full max-w-xs translate-x-0 translate-y-0 rounded-none border-r p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-xs">
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle className="font-serif text-lg">xblog 后台</DialogTitle>
          </DialogHeader>
          <AdminSidebar
            variant="drawer"
            className="min-h-[calc(100dvh-3.5rem)] border-0"
            onNavigate={() => setMobileOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <SiteBrand
        admin
        siteName={siteTheme?.site_name ?? DEFAULT_SITE_THEME.site_name}
        siteTagline={siteTheme?.site_tagline ?? DEFAULT_SITE_THEME.site_tagline}
        siteLogoUrl={siteTheme?.site_logo_url}
        className="shrink-0"
      />

      <div className="flex-1" />

      <LocaleSwitcher compact className="hidden md:flex" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative size-9 rounded-full p-0" aria-label="用户菜单">
            <UserAvatar username={user?.username ?? ".."} avatarUrl={user?.avatar_url} size="md" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 p-1.5">
          <DropdownMenuLabel className="px-2.5 py-2 font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user?.username ?? "加载中"}</span>
              <span className="text-xs text-muted-foreground">管理员</span>
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
