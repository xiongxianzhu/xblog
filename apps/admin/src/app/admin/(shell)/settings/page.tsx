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
import { adminText } from "@/lib/admin-messages";
import { useAdminMessages } from "@/lib/use-admin-messages";

const sections = [
  {
    key: "site",
    href: "#settings-site",
    get title() {
      return adminText("m0225");
    },
  },
  {
    key: "header-link",
    href: "#settings-header-link",
    get title() {
      return adminText("m0226");
    },
  },
  {
    key: "sharing",
    href: "#settings-sharing",
    get title() {
      return adminText("m0227");
    },
  },
  {
    key: "copyright",
    href: "#settings-copyright",
    get title() {
      return adminText("m0228");
    },
  },
  {
    key: "auth",
    href: "#settings-auth",
    get title() {
      return adminText("m0229");
    },
  },
  {
    key: "appearance",
    href: "#settings-appearance",
    get title() {
      return adminText("m0230");
    },
  },
  {
    key: "writing",
    href: "#settings-writing",
    get title() {
      return adminText("m0231");
    },
  },
  {
    key: "account",
    href: "#settings-account",
    get title() {
      return adminText("m0232");
    },
  },
  {
    key: "content",
    href: "#settings-content",
    get title() {
      return adminText("m0233");
    },
  },
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
  useAdminMessages();
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
  const txt = useAdminMessages();
  const { mode, palette, setMode, setPalette } = useAdminTheme();
  return (
    <div>
      <AdminPageHeader title={txt("m0234")} description={txt("m0235")} />
      <div className="admin-settings-layout">
        <nav className="admin-settings-nav" aria-label={txt("m0236")}>
          <Anchor
            affix={false}
            offsetTop={88}
            targetOffset={88}
            getCurrentAnchor={(active) => active || "#settings-site"}
            items={sections}
          />
        </nav>
        <div className="admin-settings-sections">
          <SettingsSection id="settings-site" title={txt("m0225")} description={txt("m0237")} icon={Globe}>
            <PublicSiteThemeSettings />
          </SettingsSection>
          <SettingsSection
            id="settings-header-link"
            title={txt("m0226")}
            description={txt("m0238")}
            icon={Globe}
          >
            <HeaderLinkSettingsPanel />
          </SettingsSection>
          <SettingsSection
            id="settings-sharing"
            title={txt("m0227")}
            description={txt("m0239")}
            icon={Share2}
          >
            <ArticleShareSettingsPanel />
          </SettingsSection>
          <SettingsSection
            id="settings-copyright"
            title={txt("m0228")}
            description={txt("m0240")}
            icon={FileText}
          >
            <CopyrightSettingsPanel />
          </SettingsSection>
          <SettingsSection
            id="settings-auth"
            title={txt("m0229")}
            description={txt("m0241")}
            icon={ShieldCheck}
          >
            <AuthSettingsPanel />
          </SettingsSection>
          <SettingsSection
            id="settings-appearance"
            title={txt("m0230")}
            description={txt("m0242")}
            icon={Palette}
            footer={<span className="admin-settings-save-hint">{txt("m0243")}</span>}
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
            title={txt("m0231")}
            description={txt("m0244")}
            icon={Bot}
            footer={
              <>
                <Button asChild variant="outline">
                  <Link href="/admin/ai/skills">{txt("m0245")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/admin/ai/models">{txt("m0246")}</Link>
                </Button>
              </>
            }
          />
          <SettingsSection
            id="settings-account"
            title={txt("m0232")}
            description={txt("m0247")}
            icon={UserRound}
            footer={
              <>
                <Button asChild variant="outline">
                  <Link href="/admin/profile">{txt("m0248")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/admin/password">{txt("m0157")}</Link>
                </Button>
              </>
            }
          />
          <SettingsSection
            id="settings-content"
            title={txt("m0233")}
            description={txt("m0249")}
            icon={FileText}
            footer={
              <>
                <Button asChild variant="outline">
                  <Link href="/admin/about">{txt("m0018")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/admin/projects">{txt("m0223")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/admin/links">{txt("m0050")}</Link>
                </Button>
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
