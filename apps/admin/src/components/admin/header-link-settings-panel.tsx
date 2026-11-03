import { Alert, Input, Switch } from "antd";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { getHeaderLink, saveHeaderLink } from "@/lib/api";
import { toast } from "@/lib/feedback";

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
  const { data, error, isLoading, mutate } = useSWR("admin-header-link", getHeaderLink);
  const [enabled, setEnabled] = useState(true);
  const [name, setName] = useState("公开站");
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
      const saved = await saveHeaderLink({ enabled, name: name.trim(), url: url.trim() });
      await mutate(saved, false);
      toast.success("顶栏快捷入口已保存");
    } catch (err) {
      toast.error("保存失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    } finally {
      setSaving(false);
    }
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">加载快捷入口…</p>;
  if (error || !data)
    return (
      <Alert
        type="error"
        title="快捷入口加载失败"
        action={
          <Button variant="outline" onClick={() => void mutate()}>
            重试
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
            显示快捷入口
          </label>
          <p className="mt-1 mb-0 text-xs text-muted-foreground">
            显示在管理后台右上角，关闭时保留名称和地址。
          </p>
        </div>
        <Switch id="header-link-enabled" checked={enabled} onChange={setEnabled} disabled={saving} />
      </div>
      <div className="space-y-2">
        <label htmlFor="header-link-name" className="text-sm font-medium">
          入口名称
        </label>
        <Input
          id="header-link-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          disabled={saving}
          required
          placeholder="例如：公开站"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="header-link-url" className="text-sm font-medium">
          链接地址
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
          填写完整 HTTP/HTTPS 地址，或用 / 指向本站首页。入口在新标签页打开。
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
          重置修改
        </Button>
        <Button type="submit" disabled={saving || !changed || !valid}>
          {saving ? "保存中…" : "保存入口"}
        </Button>
      </div>
    </form>
  );
}
