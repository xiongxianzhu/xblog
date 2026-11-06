import { Alert, Switch } from "antd";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { getAdminSiteTheme, updateAdminSiteTheme } from "@/lib/api";
import { toast } from "@/lib/feedback";

export function ArticleShareSettingsPanel() {
  const { data, error, isLoading, mutate } = useSWR("admin-site-theme", getAdminSiteTheme);
  const [saving, setSaving] = useState(false);
  async function save(enabled: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updateAdminSiteTheme({ article_share_enabled: enabled });
      await mutate(updated, false);
      toast.success(enabled ? "文章分享已开启" : "文章分享已关闭");
    } catch (err) {
      toast.error("保存失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    } finally {
      setSaving(false);
    }
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">加载文章分享设置…</p>;
  if (error || !data)
    return (
      <Alert
        type="error"
        title="文章分享设置加载失败"
        action={<Button onClick={() => void mutate()}>重试</Button>}
      />
    );
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor="article-share-enabled" className="text-sm font-medium">
          开启文章分享
        </label>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted-foreground">
          正文下方显示分享按钮，可复制链接或扫码访问当前文章。修改后自动保存；已打开的文章需刷新后生效。
        </p>
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
