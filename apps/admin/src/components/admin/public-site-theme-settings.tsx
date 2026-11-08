import { Switch } from "antd";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { SiteLogoEditor } from "@/components/admin/site-logo-editor";
import { SiteBrand } from "@/components/site-brand";
import { SiteThemeSettingsPanel } from "@/components/theme/theme-settings-panel";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { adminText, localizeAdminNotice } from "@/lib/admin-messages";
import { getAdminSiteTheme, updateAdminSiteTheme } from "@/lib/api";
import { useRouter } from "@/lib/navigation";
import type { SitePaletteId } from "@/lib/themes";
import { PUBLIC_POSTS_PER_PAGE_OPTIONS, type SitePublicTheme } from "@/lib/themes";
import { useAdminMessages } from "@/lib/use-admin-messages";

const navLabels: Record<string, string> = {
  get blog() {
    return adminText("m0681");
  },
  get tags() {
    return adminText("m0650");
  },
  get about() {
    return adminText("m0018");
  },
  get projects() {
    return adminText("m0682");
  },
  get links() {
    return adminText("m0050");
  },
  get search() {
    return adminText("m0683");
  },
};
type PublicSiteColorMode = SitePublicTheme["mode"];
export function PublicSiteThemeSettings() {
  const txt = useAdminMessages();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("admin-site-theme", getAdminSiteTheme);
  const [siteBaseUrl, setSiteBaseUrl] = useState("");
  const [savingBaseUrl, setSavingBaseUrl] = useState(false);
  const [baseUrlMessage, setBaseUrlMessage] = useState<string | null>(null);
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [savingGithub, setSavingGithub] = useState(false);
  const [githubMessage, setGithubMessage] = useState<string | null>(null);
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
  useEffect(() => {
    setGithubEnabled(data?.github_link_enabled ?? false);
    setGithubUrl(data?.github_link_url ?? "");
  }, [data?.github_link_enabled, data?.github_link_url]);
  useEffect(() => {
    setSiteBaseUrl(data?.site_base_url ?? "");
  }, [data?.site_base_url]);
  async function saveBaseUrl() {
    if (savingBaseUrl) return;
    setSavingBaseUrl(true);
    setBaseUrlMessage(null);
    try {
      const saved = await updateAdminSiteTheme({
        site_base_url: siteBaseUrl.trim(),
      });
      await mutate(saved, false);
      setSiteBaseUrl(saved.site_base_url);
      setBaseUrlMessage(txt("m0684"));
    } catch (error) {
      setBaseUrlMessage(getAdminErrorMessage(error));
    } finally {
      setSavingBaseUrl(false);
    }
  }
  async function saveGithub() {
    if (savingGithub) return;
    const url = githubUrl.trim();
    if (githubEnabled && !url) {
      setGithubMessage(txt("m0685"));
      return;
    }
    if (url) {
      try {
        const parsed = new URL(url);
        if (
          !/^https?:\/\//i.test(url) ||
          !parsed.hostname ||
          parsed.username ||
          parsed.password ||
          url.includes("\\") ||
          [...url].some((char) => char.charCodeAt(0) < 32)
        )
          throw new Error();
      } catch {
        setGithubMessage(txt("m0686"));
        return;
      }
    }
    setSavingGithub(true);
    setGithubMessage(null);
    try {
      const saved = await updateAdminSiteTheme({
        github_link_enabled: githubEnabled,
        github_link_url: url,
      });
      await mutate(saved, false);
      setGithubMessage(txt("m0687"));
    } catch (error) {
      setGithubMessage(getAdminErrorMessage(error));
    } finally {
      setSavingGithub(false);
    }
  }
  async function persist(next: Partial<SitePublicTheme>) {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await updateAdminSiteTheme(next);
      await mutate(saved, false);
      router.refresh();
      setMessage(txt("m0688"));
    } catch {
      setMessage(txt("m0521"));
    } finally {
      setSaving(false);
    }
  }
  async function handleBrandSave() {
    if (!data || savingBrand) return;
    const name = siteName.trim();
    if (!name) {
      setMessage(txt("m0689"));
      return;
    }
    setSavingBrand(true);
    setMessage(null);
    try {
      const saved = await updateAdminSiteTheme({
        site_name: name,
        site_tagline: siteTagline.trim(),
        site_logo_url: siteLogoUrl.trim(),
        site_icp_number: siteIcpNumber.trim(),
      });
      await mutate(saved, false);
      router.refresh();
      setMessage(txt("m0690"));
    } catch {
      setMessage(txt("m0521"));
    } finally {
      setSavingBrand(false);
    }
  }
  function handleModeChange(mode: PublicSiteColorMode) {
    if (!data || saving) return;
    void persist({
      mode,
    });
  }
  function handlePaletteChange(palette: SitePaletteId) {
    if (!data || saving) return;
    void persist({
      palette,
    });
  }
  function handlePostsPerPageChange(postsPerPage: number) {
    if (!data || saving) return;
    void persist({
      posts_per_page: postsPerPage,
    });
  }
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{txt("m0691")}</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{txt("m0053")}</p>;
  }
  const navOrder = [...new Set([...(data.nav_order ?? []), ...Object.keys(navLabels)])].filter(
    (key) => key in navLabels,
  );
  function moveNav(index: number, delta: number) {
    const next = [...navOrder];
    const to = index + delta;
    if (saving || to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    void persist({
      nav_order: next,
    });
  }
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">{txt("m0692")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{txt("m0693")}</p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="site-name">{txt("m0694")}</FieldLabel>
            <Input
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="xblog"
              maxLength={100}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="site-tagline">{txt("m0695")}</FieldLabel>
            <Input
              id="site-tagline"
              value={siteTagline}
              onChange={(e) => setSiteTagline(e.target.value)}
              placeholder="Ink & Paper"
              maxLength={120}
            />
            <FieldDescription>{txt("m0696")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="site-icp-number">{txt("m0697")}</FieldLabel>
            <Input
              id="site-icp-number"
              value={siteIcpNumber}
              onChange={(e) => setSiteIcpNumber(e.target.value)}
              placeholder={txt("m0698")}
              maxLength={50}
            />
            <FieldDescription>{txt("m0699")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{txt("m0700")}</FieldLabel>
            <SiteLogoEditor
              siteLogoUrl={siteLogoUrl.trim() || null}
              disabled={savingBrand}
              onChange={(saved) => {
                setSiteLogoUrl(saved.site_logo_url ?? "");
                void mutate(saved, false);
                router.refresh();
                setMessage(txt("m0701"));
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="site-logo-url">{txt("m0702")}</FieldLabel>
            <Input
              id="site-logo-url"
              value={siteLogoUrl}
              onChange={(e) => setSiteLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              maxLength={500}
            />
            <FieldDescription>{txt("m0703")}</FieldDescription>
          </Field>
        </FieldGroup>
        <div className="admin-settings-brand-actions">
          <div className="min-w-0">
            <p className="mb-2 text-xs text-muted-foreground">{txt("m0704")}</p>
            <SiteBrand
              siteName={siteName.trim() || "xblog"}
              siteTagline={siteTagline.trim()}
              siteLogoUrl={siteLogoUrl.trim() || null}
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={savingBrand}
              onClick={() => {
                setSiteName(data.site_name);
                setSiteTagline(data.site_tagline ?? "");
                setSiteLogoUrl(data.site_logo_url ?? "");
                setSiteIcpNumber(data.site_icp_number ?? "");
                setMessage(null);
              }}
            >
              {txt("m0543")}
            </Button>
            <Button type="button" disabled={savingBrand} onClick={() => void handleBrandSave()}>
              {savingBrand ? txt("m0015") : txt("m0705")}
            </Button>
          </div>
        </div>
      </div>

      <Separator />
      <section className="space-y-4" aria-labelledby="site-base-url-title">
        <h3 id="site-base-url-title" className="text-sm font-medium">
          {txt("m0706")}
        </h3>
        <Field>
          <FieldLabel htmlFor="site-base-url">{txt("m0707")}</FieldLabel>
          <Input
            id="site-base-url"
            type="url"
            value={siteBaseUrl}
            onChange={(event) => setSiteBaseUrl(event.target.value)}
            placeholder="https://blog.example.com"
            maxLength={500}
            disabled={savingBaseUrl}
            aria-describedby="site-base-url-help"
          />
          <p id="site-base-url-help" className="text-sm text-muted-foreground">
            {txt("m0708")}
          </p>
        </Field>
        <Button type="button" disabled={savingBaseUrl} onClick={() => void saveBaseUrl()}>
          {savingBaseUrl ? txt("m0015") : txt("m0709")}
        </Button>
        {baseUrlMessage ? (
          <p role="status" className="text-sm text-muted-foreground">
            {baseUrlMessage}
          </p>
        ) : null}
      </section>
      <Separator />
      <section className="space-y-4" aria-labelledby="github-link-title">
        <div>
          <h3 id="github-link-title" className="text-sm font-medium">
            {txt("m0710")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{txt("m0711")}</p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="github-link-enabled">{txt("m0712")}</FieldLabel>
            <Switch
              id="github-link-enabled"
              checked={githubEnabled}
              onChange={setGithubEnabled}
              disabled={savingGithub}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="github-link-url">{txt("m0713")}</FieldLabel>
            <Input
              id="github-link-url"
              type="url"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              placeholder="https://github.com/username"
              maxLength={500}
              disabled={savingGithub}
              aria-describedby="github-link-help"
            />
            <p id="github-link-help" className="text-sm text-muted-foreground">
              {txt("m0714")}
            </p>
          </Field>
        </FieldGroup>
        <Button type="button" disabled={savingGithub} onClick={() => void saveGithub()}>
          {savingGithub ? txt("m0015") : txt("m0715")}
        </Button>
        {githubMessage ? (
          <p role="status" className="text-sm text-muted-foreground">
            {githubMessage}
          </p>
        ) : null}
      </section>
      <Separator />
      <section aria-labelledby="nav-order-title">
        <h3 id="nav-order-title" className="text-sm font-medium">
          {txt("m0716")}
        </h3>
        <p className="text-sm text-muted-foreground">{txt("m0717")}</p>
        <ol className="max-w-lg divide-y divide-border rounded-sm border border-border">
          {navOrder.map((key, index) => (
            <li key={key} className="flex items-center gap-2 px-3 py-1">
              <span className="flex-1">{navLabels[key]}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={txt("m0718", {
                  p0: navLabels[key],
                })}
                title={txt("m0719")}
                disabled={saving || index === 0}
                onClick={() => moveNav(index, -1)}
              >
                <ArrowUp size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={txt("m0720", {
                  p0: navLabels[key],
                })}
                title={txt("m0721")}
                disabled={saving || index === navOrder.length - 1}
                onClick={() => moveNav(index, 1)}
              >
                <ArrowDown size={16} />
              </Button>
            </li>
          ))}
        </ol>
      </section>
      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">{txt("m0722")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{txt("m0723")}</p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="posts-per-page">{txt("m0724")}</FieldLabel>
            <Select
              value={String(data.posts_per_page)}
              onValueChange={(value) => handlePostsPerPageChange(Number(value))}
              disabled={saving}
            >
              <SelectTrigger id="posts-per-page" className="w-[8rem]" aria-label={txt("m0724")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PUBLIC_POSTS_PER_PAGE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {txt("articlesPerPage", { count: size })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{txt("m0726")}</FieldDescription>
          </Field>
        </FieldGroup>
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{txt("m0727")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{txt("m0728")}</p>
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

      {message ? <p className="text-sm text-muted-foreground">{localizeAdminNotice(message)}</p> : null}
    </div>
  );
}
