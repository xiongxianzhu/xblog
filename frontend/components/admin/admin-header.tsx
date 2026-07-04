"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import {
  KeyRoundIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  PenLineIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAdminTheme, useAdminThemeLabels } from "@/components/admin/theme-provider";
import { UserAvatar } from "@/components/admin/user-avatar";
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
import { getMe, logout } from "@/lib/api";
import { ADMIN_PALETTES, type AdminPaletteId, type ColorMode } from "@/lib/themes";

export function AdminHeader() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: user } = useSWR("admin-me", getMe);
  const { mode, palette, setMode, setPalette } = useAdminTheme();
  const { modeLabel, paletteLabel } = useAdminThemeLabels();

  async function handleLogout() {
    await logout();
    router.replace("/admin");
    router.refresh();
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

      <Link href="/admin/dashboard" className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight">
        <PenLineIcon className="size-4 text-primary" />
        <span>xblog</span>
      </Link>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative size-9 rounded-full p-0" aria-label="用户菜单">
            <UserAvatar username={user?.username ?? ".."} avatarUrl={user?.avatar_url} size="md" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user?.username ?? "加载中"}</span>
              <span className="text-xs text-muted-foreground">管理员</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/admin/profile")}>
            <UserIcon />
            个人资料
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/admin/settings")}>
            <SettingsIcon />
            设置
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PaletteIcon />
              后台主题
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {paletteLabel} · {modeLabel}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">配色</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={palette} onValueChange={(value) => setPalette(value as AdminPaletteId)}>
                {ADMIN_PALETTES.map((item) => (
                  <DropdownMenuRadioItem key={item.id} value={item.id}>
                    {item.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">亮度</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={mode} onValueChange={(value) => setMode(value as ColorMode)}>
                <DropdownMenuRadioItem value="light">
                  <SunIcon />
                  浅色
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <MoonIcon />
                  深色
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <MonitorIcon />
                  跟随系统
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => router.push("/admin/password")}>
            <KeyRoundIcon />
            修改密码
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void handleLogout()}>
            <LogOutIcon />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
