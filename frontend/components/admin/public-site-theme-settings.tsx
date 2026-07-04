"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

import { SiteThemeSettingsPanel } from "@/components/theme/theme-settings-panel";
import { getAdminSiteTheme, updateAdminSiteTheme } from "@/lib/api";
import type { SitePublicTheme } from "@/lib/themes";
import type { SitePaletteId } from "@/lib/themes";

type PublicSiteColorMode = SitePublicTheme["mode"];

export function PublicSiteThemeSettings() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("admin-site-theme", getAdminSiteTheme);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function persist(next: SitePublicTheme) {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await updateAdminSiteTheme(next);
      await mutate(saved, false);
      router.refresh();
      setMessage("已保存。公开站访客将看到更新后的主题，若未立即生效请强制刷新页面。");
    } catch {
      setMessage("保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  function handleModeChange(mode: PublicSiteColorMode) {
    if (!data || saving) return;
    void persist({ ...data, mode });
  }

  function handlePaletteChange(palette: SitePaletteId) {
    if (!data || saving) return;
    void persist({ ...data, palette });
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">加载主题配置…</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">加载失败，请刷新页面。</p>;
  }

  return (
    <div className="space-y-3">
      <SiteThemeSettingsPanel
        mode={data.mode}
        palette={data.palette}
        allowSystem={false}
        disabled={saving}
        onModeChange={(mode) => handleModeChange(mode as PublicSiteColorMode)}
        onPaletteChange={handlePaletteChange}
      />
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
