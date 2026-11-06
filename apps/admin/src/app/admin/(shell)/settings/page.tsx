import { Anchor } from "antd";
import { Bot, FileText, Globe, type LucideIcon, Palette, Share2, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArticleShareSettingsPanel } from "@/components/admin/article-share-settings-panel";
import { AuthSettingsPanel } from "@/components/admin/auth-settings-panel";
import { CopyrightSettingsPanel } from "@/components/admin/copyright-settings-panel";
import { HeaderLinkSettingsPanel } from "@/components/admin/header-link-settings-panel";
import { PublicSiteThemeSettings } from "@/components/admin/public-site-theme-settings";
import { useAdminTheme } from "@/components/admin/theme-provider";
import Link from "@/components/link";
import { AdminThemeSettingsPanel } from "@/components/theme/theme-settings-panel";
import { Button } from "@/components/ui/button";

const sections = [
  { key: "site", href: "#settings-site", title: "公开站设置" },
  { key: "header-link", href: "#settings-header-link", title: "顶栏快捷入口" },
  { key: "sharing", href: "#settings-sharing", title: "文章分享" },
  { key: "copyright", href: "#settings-copyright", title: "文章版权声明" },
  { key: "auth", href: "#settings-auth", title: "登录与验证" },
  { key: "appearance", href: "#settings-appearance", title: "后台外观" },
  { key: "writing", href: "#settings-writing", title: "AI 写作" },
  { key: "account", href: "#settings-account", title: "账号安全" },
  { key: "content", href: "#settings-content", title: "站点内容" },
];

function SettingsSection({
  id,
  title,
  description,
  icon: Icon,
  children,
  footer,
}: {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section id={id} className="admin-settings-section" aria-labelledby={`${id}-title`}>
      <header className="admin-settings-section-header">
        <span className="admin-settings-section-icon">
          <Icon size={20} aria-hidden />
        </span>
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {children ? <div className="admin-settings-section-body">{children}</div> : null}
      {footer ? <footer className="admin-settings-section-footer">{footer}</footer> : null}
    </section>
  );
}

export default function AdminSettingsPage() {
  const { mode, palette, setMode, setPalette } = useAdminTheme();
  return (
    <div>
      <AdminPageHeader title="设置" description="管理站点外观、登录方式与个人偏好。" />
      <div className="admin-settings-layout">
        <nav className="admin-settings-nav" aria-label="设置分区">
          <Anchor
            affix={false}
            offsetTop={88}
            targetOffset={88}
            getCurrentAnchor={(active) => active || "#settings-site"}
            items={sections}
          />
        </nav>
        <div className="admin-settings-sections">
          <SettingsSection
            id="settings-site"
            title="公开站设置"
            description="管理站点品牌、备案信息、文章列表与公开站主题。"
            icon={Globe}
          >
            <PublicSiteThemeSettings />
          </SettingsSection>
          <SettingsSection
            id="settings-header-link"
            title="顶栏快捷入口"
            description="配置管理后台右上角快捷链接的名称、地址与显示状态。"
            icon={Globe}
          >
            <HeaderLinkSettingsPanel />
          </SettingsSection>
          <SettingsSection
            id="settings-sharing"
            title="文章分享"
            description="控制公开文章详情页的分享入口与二维码。"
            icon={Share2}
          >
            <ArticleShareSettingsPanel />
          </SettingsSection>
          <SettingsSection
            id="settings-copyright"
            title="文章版权声明"
            description="配置文章正文下方的转载说明与授权协议。"
            icon={FileText}
          >
            <CopyrightSettingsPanel />
          </SettingsSection>
          <SettingsSection
            id="settings-auth"
            title="登录与验证"
            description="选择可用的登录方式及人机验证保护。开关修改后立即保存。"
            icon={ShieldCheck}
          >
            <AuthSettingsPanel />
          </SettingsSection>
          <SettingsSection
            id="settings-appearance"
            title="后台外观"
            description="仅影响当前浏览器中的管理后台，与公开站主题独立。"
            icon={Palette}
            footer={<span className="admin-settings-save-hint">选择后自动保存到当前浏览器</span>}
          >
            <AdminThemeSettingsPanel
              mode={mode}
              palette={palette}
              onModeChange={setMode}
              onPaletteChange={setPalette}
            />
          </SettingsSection>
          <SettingsSection
            id="settings-writing"
            title="AI 写作"
            description="管理写作模型与 Skills，供文章编辑器调用。"
            icon={Bot}
            footer={
              <>
                <Button asChild variant="outline">
                  <Link href="/admin/ai/skills">管理 Skills</Link>
                </Button>
                <Button asChild>
                  <Link href="/admin/ai/models">管理 AI 模型</Link>
                </Button>
              </>
            }
          />
          <SettingsSection
            id="settings-account"
            title="账号安全"
            description="维护个人资料、联系方式与登录密码。"
            icon={UserRound}
            footer={
              <>
                <Button asChild variant="outline">
                  <Link href="/admin/profile">个人资料</Link>
                </Button>
                <Button asChild>
                  <Link href="/admin/password">修改密码</Link>
                </Button>
              </>
            }
          />
          <SettingsSection
            id="settings-content"
            title="站点内容"
            description="编辑固定页面和友情链接，更新公开站展示内容。"
            icon={FileText}
            footer={
              <>
                <Button asChild variant="outline">
                  <Link href="/admin/about">关于</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/admin/projects">作品集</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/admin/links">友链</Link>
                </Button>
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
