import { Button, Drawer, Input } from "antd";
import { useState } from "react";
import { ContentWidthSelect } from "@/components/ui/content-width-select";
import { toast } from "@/lib/feedback";
import { type MediaAsset, type MediaGroup, updateMedia } from "@/lib/media-api";

export function MediaEditor({
  asset,
  groups,
  onClose,
  onSaved,
}: {
  asset: MediaAsset;
  groups: MediaGroup[];
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [name, setName] = useState(asset.name);
  const [group, setGroup] = useState<number | null>(asset.group_id);
  const [saving, setSaving] = useState(false);
  return (
    <Drawer open title="素材信息" size={440} onClose={() => !saving && onClose()} closable={!saving}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || saving) return;
          setSaving(true);
          try {
            await updateMedia(asset.id, { name: name.trim(), group_id: group });
            await onSaved();
            toast.success("素材已更新");
            onClose();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "更新失败");
          } finally {
            setSaving(false);
          }
        }}
      >
        <label htmlFor="media-name" className="mb-2 block text-sm font-medium">
          名称
        </label>
        <Input
          id="media-name"
          required
          maxLength={255}
          disabled={saving}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label htmlFor="media-group" className="mb-2 mt-6 block text-sm font-medium">
          所属分组
        </label>
        <ContentWidthSelect<number>
          id="media-group"
          value={group ?? 0}
          disabled={saving}
          onChange={(value) => setGroup(value || null)}
          className="w-full"
          options={[
            { value: 0, label: "未分组" },
            ...groups.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <p className="mt-4 break-all text-xs text-muted-foreground">原文件：{asset.original_name}</p>
        <div className="mt-6 flex justify-end gap-3 border-t pt-5">
          <Button disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button htmlType="submit" type="primary" loading={saving} disabled={!name.trim()}>
            保存
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
