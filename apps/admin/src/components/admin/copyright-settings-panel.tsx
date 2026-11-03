import { Alert, Input, Switch } from "antd";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { getAdminSiteTheme, updateAdminSiteTheme } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { DEFAULT_SITE_THEME } from "@/lib/themes";

export function CopyrightSettingsPanel() {
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
      toast.success("版权声明已保存");
    } catch (err) {
      toast.error("保存失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    } finally {
      setSaving(false);
    }
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">加载版权声明…</p>;
  if (error || !data)
    return (
      <Alert
        type="error"
        title="版权声明加载失败"
        action={
          <Button variant="outline" onClick={() => void mutate()}>
            重试
          </Button>
        }
      />
    );
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <label htmlFor="copyright-enabled" className="text-sm font-medium">
            显示文章版权声明
          </label>
          <p className="mt-1 mb-0 text-xs text-muted-foreground">
            保存后应用于所有文章详情页；关闭时保留内容。
          </p>
        </div>
        <Switch id="copyright-enabled" checked={enabled} disabled={saving} onChange={setEnabled} />
      </div>
      <div className="space-y-2">
        <label htmlFor="copyright-content" className="text-sm font-medium">
          声明内容
        </label>
        <Input.TextArea
          id="copyright-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={saving}
          autoSize={{ minRows: 5, maxRows: 12 }}
          maxLength={500}
          showCount
          aria-describedby="copyright-help"
          status={enabled && !content.trim() ? "error" : undefined}
        />
        <p id="copyright-help" className="pt-2 text-xs text-muted-foreground">
          支持 Markdown 链接和简单排版，最多 500 字。开启时内容不能为空。
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
          重置修改
        </Button>
        <Button disabled={saving || !changed || (enabled && !content.trim())} onClick={() => void save()}>
          {saving ? "保存中…" : "保存声明"}
        </Button>
      </div>
    </div>
  );
}
