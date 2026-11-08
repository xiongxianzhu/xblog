import { Alert, Switch } from "antd";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { getAdminSiteTheme, updateAdminSiteTheme } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useAdminMessages } from "@/lib/use-admin-messages";
export function ArticleShareSettingsPanel() {
  const txt = useAdminMessages();
  const { data, error, isLoading, mutate } = useSWR("admin-site-theme", getAdminSiteTheme);
  const [saving, setSaving] = useState(false);
  async function save(enabled: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updateAdminSiteTheme({
        article_share_enabled: enabled,
      });
      await mutate(updated, false);
      toast.success(enabled ? txt("m0514") : txt("m0515"));
    } catch (err) {
      toast.error(txt("m0434"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">{txt("m0516")}</p>;
  if (error || !data)
    return (
      <Alert
        type="error"
        title={txt("m0517")}
        action={<Button onClick={() => void mutate()}>{txt("m0028")}</Button>}
      />
    );
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor="article-share-enabled" className="text-sm font-medium">
          {txt("m0518")}
        </label>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted-foreground">{txt("m0519")}</p>
      </div>
      <Switch
        id="article-share-enabled"
        checked={data.article_share_enabled ?? false}
        loading={saving}
        disabled={saving}
        onChange={(enabled) => void save(enabled)}
      />
    </div>
  );
}
