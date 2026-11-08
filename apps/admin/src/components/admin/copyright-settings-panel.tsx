import { Alert, Input, Switch } from "antd";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { getAdminSiteTheme, updateAdminSiteTheme } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { DEFAULT_SITE_THEME } from "@/lib/themes";
import { useAdminMessages } from "@/lib/use-admin-messages";
export function CopyrightSettingsPanel() {
  const txt = useAdminMessages();
  const { data, error, isLoading, mutate } = useSWR("admin-site-theme", getAdminSiteTheme);
  const [enabled, setEnabled] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const storedEnabled = data?.copyright_enabled ?? false;
  const storedContent = data?.copyright_content ?? DEFAULT_SITE_THEME.copyright_content;
  useEffect(() => {
    setEnabled(storedEnabled);
    setContent(storedContent);
  }, [storedEnabled, storedContent]);
  const changed = !!data && (enabled !== storedEnabled || content !== storedContent);
  async function save() {
    if (saving || (enabled && !content.trim())) return;
    setSaving(true);
    try {
      const updated = await updateAdminSiteTheme({
        copyright_enabled: enabled,
        copyright_content: content.trim(),
      });
      await mutate(updated, false);
      toast.success(txt("m0536"));
    } catch (err) {
      toast.error(txt("m0434"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">{txt("m0537")}</p>;
  if (error || !data)
    return (
      <Alert
        type="error"
        title={txt("m0538")}
        action={
          <Button variant="outline" onClick={() => void mutate()}>
            {txt("m0028")}
          </Button>
        }
      />
    );
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <label htmlFor="copyright-enabled" className="text-sm font-medium">
            {txt("m0539")}
          </label>
          <p className="mt-1 mb-0 text-xs text-muted-foreground">{txt("m0540")}</p>
        </div>
        <Switch id="copyright-enabled" checked={enabled} disabled={saving} onChange={setEnabled} />
      </div>
      <div className="space-y-2">
        <label htmlFor="copyright-content" className="text-sm font-medium">
          {txt("m0541")}
        </label>
        <Input.TextArea
          id="copyright-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={saving}
          autoSize={{
            minRows: 5,
            maxRows: 12,
          }}
          maxLength={500}
          showCount
          aria-describedby="copyright-help"
          status={enabled && !content.trim() ? "error" : undefined}
        />
        <p id="copyright-help" className="pt-2 text-xs text-muted-foreground">
          {txt("m0542")}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          disabled={saving || !changed}
          onClick={() => {
            setEnabled(storedEnabled);
            setContent(storedContent);
          }}
        >
          {txt("m0543")}
        </Button>
        <Button disabled={saving || !changed || (enabled && !content.trim())} onClick={() => void save()}>
          {saving ? txt("m0015") : txt("m0544")}
        </Button>
      </div>
    </div>
  );
}
