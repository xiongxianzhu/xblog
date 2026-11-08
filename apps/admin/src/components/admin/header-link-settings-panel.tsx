import { Alert, Input, Switch } from "antd";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { getHeaderLink, saveHeaderLink } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useAdminMessages } from "@/lib/use-admin-messages";

function validUrl(value: string) {
  if (value === "/") return true;
  if (
    !/^https?:\/\//i.test(value) ||
    value.includes("\\") ||
    [...value].some((char) => char.charCodeAt(0) < 32)
  )
    return false;
  try {
    const url = new URL(value);
    return !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function HeaderLinkSettingsPanel() {
  const txt = useAdminMessages();
  const { data, error, isLoading, mutate } = useSWR("admin-header-link", getHeaderLink);
  const [enabled, setEnabled] = useState(true);
  const [name, setName] = useState(txt("m0561"));
  const [url, setUrl] = useState("/");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setName(data.name);
      setUrl(data.url);
    }
  }, [data]);
  const changed = !!data && (enabled !== data.enabled || name !== data.name || url !== data.url);
  const valid = !!name.trim() && validUrl(url.trim());
  async function save() {
    if (saving || !valid) return;
    setSaving(true);
    try {
      const saved = await saveHeaderLink({
        enabled,
        name: name.trim(),
        url: url.trim(),
      });
      await mutate(saved, false);
      toast.success(txt("m0562"));
    } catch (err) {
      toast.error(txt("m0434"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">{txt("m0563")}</p>;
  if (error || !data)
    return (
      <Alert
        type="error"
        title={txt("m0564")}
        action={
          <Button variant="outline" onClick={() => void mutate()}>
            {txt("m0028")}
          </Button>
        }
      />
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <label htmlFor="header-link-enabled" className="text-sm font-medium">
            {txt("m0565")}
          </label>
          <p className="mt-1 mb-0 text-xs text-muted-foreground">{txt("m0566")}</p>
        </div>
        <Switch id="header-link-enabled" checked={enabled} onChange={setEnabled} disabled={saving} />
      </div>
      <div className="space-y-2">
        <label htmlFor="header-link-name" className="text-sm font-medium">
          {txt("m0567")}
        </label>
        <Input
          id="header-link-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          disabled={saving}
          required
          placeholder={txt("m0568")}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="header-link-url" className="text-sm font-medium">
          {txt("m0569")}
        </label>
        <Input
          id="header-link-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={500}
          disabled={saving}
          required
          placeholder="https://example.com"
          aria-describedby="header-link-url-help"
          status={url && !validUrl(url.trim()) ? "error" : undefined}
        />
        <p id="header-link-url-help" className="text-xs text-muted-foreground">
          {txt("m0570")}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          disabled={saving || !changed}
          onClick={() => {
            setEnabled(data.enabled);
            setName(data.name);
            setUrl(data.url);
          }}
        >
          {txt("m0543")}
        </Button>
        <Button type="submit" disabled={saving || !changed || !valid}>
          {saving ? txt("m0015") : txt("m0571")}
        </Button>
      </div>
    </form>
  );
}
