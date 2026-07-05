"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

import { SiteBrand } from "@/components/site-brand";
import { SiteLogoEditor } from "@/components/admin/site-logo-editor";
import { SiteThemeSettingsPanel } from "@/components/theme/theme-settings-panel";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getAdminSiteTheme, updateAdminSiteTheme } from "@/lib/api";
import type { SitePublicTheme } from "@/lib/themes";
import type { SitePaletteId } from "@/lib/themes";

type PublicSiteColorMode = SitePublicTheme["mode"];

export function PublicSiteThemeSettings() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("admin-site-theme", getAdminSiteTheme);
  const [saving, setSaving] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteTagline, setSiteTagline] = useState("");
  const [siteLogoUrl, setSiteLogoUrl] = useState("");
  const [siteIcpNumber, setSiteIcpNumber] = useState("");

  useEffect(() => {
    if (!data) return;
    setSiteName(data.site_name);
    setSiteTagline(data.site_tagline ?? "");
    setSiteLogoUrl(data.site_logo_url ?? "");
    setSiteIcpNumber(data.site_icp_number ?? "");
  }, [data]);

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

  async function handleBrandSave() {
    if (!data || savingBrand) return;
    const name = siteName.trim();
    if (!name) {
      setMessage("站点名称不能为空。");
      return;
    }
    setSavingBrand(true);
    setMessage(null);
    try {
      const saved = await updateAdminSiteTheme({
        ...data,
        site_name: name,
        site_tagline: siteTagline.trim(),
        site_logo_url: siteLogoUrl.trim(),
        site_icp_number: siteIcpNumber.trim(),
      });
      await mutate(saved, false);
      router.refresh();
      setMessage("品牌信息已保存。");
    } catch {
      setMessage("保存失败，请稍后重试。");
    } finally {
      setSavingBrand(false);
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
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">站点品牌</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            公开站导航栏、管理后台顶栏与登录页的名称、副标题、LOGO，保存后对所有访客与管理员生效。
          </p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="site-name">站点名称</FieldLabel>
            <Input
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="xblog"
              maxLength={100}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="site-tagline">站点副标题</FieldLabel>
            <Input
              id="site-tagline"
              value={siteTagline}
              onChange={(e) => setSiteTagline(e.target.value)}
              placeholder="Ink & Paper"
              maxLength={120}
            />
            <FieldDescription>显示在站点名称下方；留空则不显示副标题。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="site-icp-number">网站备案号</FieldLabel>
            <Input
              id="site-icp-number"
              value={siteIcpNumber}
              onChange={(e) => setSiteIcpNumber(e.target.value)}
              placeholder="京ICP备12345678号"
              maxLength={50}
            />
            <FieldDescription>显示在公开站页脚；留空则不显示。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>LOGO 图片</FieldLabel>
            <SiteLogoEditor
              siteLogoUrl={siteLogoUrl.trim() || null}
              disabled={savingBrand}
              onChange={(saved) => {
                setSiteLogoUrl(saved.site_logo_url ?? "");
                void mutate(saved, false);
                router.refresh();
                setMessage("LOGO 已更新。");
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="site-logo-url">或填写 LOGO 图片 URL</FieldLabel>
            <Input
              id="site-logo-url"
              value={siteLogoUrl}
              onChange={(e) => setSiteLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              maxLength={500}
            />
            <FieldDescription>留空则仅显示文字名称；也可填写外部图片地址（含 SVG）。</FieldDescription>
          </Field>
        </FieldGroup>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" variant="secondary" disabled={savingBrand} onClick={() => void handleBrandSave()}>
            {savingBrand ? "保存中…" : "保存品牌"}
          </Button>
          <div className="site-glass-panel rounded-sm px-4 py-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">预览</p>
            <SiteBrand
              siteName={siteName.trim() || "xblog"}
              siteTagline={siteTagline.trim()}
              siteLogoUrl={siteLogoUrl.trim() || null}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">配色与明暗</h3>
          <p className="mt-1 text-sm text-muted-foreground">公开站全局主题，切换后立即保存。</p>
        </div>
        <SiteThemeSettingsPanel
          mode={data.mode}
          palette={data.palette}
          allowSystem={false}
          disabled={saving}
          onModeChange={(mode) => handleModeChange(mode as PublicSiteColorMode)}
          onPaletteChange={handlePaletteChange}
        />
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
