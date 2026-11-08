import { Button, Drawer, Input } from "antd";
import { useState } from "react";
import { ContentWidthSelect } from "@/components/ui/content-width-select";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { toast } from "@/lib/feedback";
import { type MediaAsset, type MediaGroup, updateMedia } from "@/lib/media-api";
import { useAdminMessages } from "@/lib/use-admin-messages";
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
  const txt = useAdminMessages();
  const [name, setName] = useState(asset.name);
  const [group, setGroup] = useState<number | null>(asset.group_id);
  const [saving, setSaving] = useState(false);
  return (
    <Drawer open title={txt("m0599")} size={440} onClose={() => !saving && onClose()} closable={!saving}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || saving) return;
          setSaving(true);
          try {
            await updateMedia(asset.id, {
              name: name.trim(),
              group_id: group,
            });
            await onSaved();
            toast.success(txt("m0600"));
            onClose();
          } catch (err) {
            toast.error(getAdminErrorMessage(err));
          } finally {
            setSaving(false);
          }
        }}
      >
        <label htmlFor="media-name" className="mb-2 block text-sm font-medium">
          {txt("m0061")}
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
          {txt("m0601")}
        </label>
        <ContentWidthSelect<number>
          id="media-group"
          value={group ?? 0}
          disabled={saving}
          onChange={(value) => setGroup(value || null)}
          className="w-full"
          options={[
            {
              value: 0,
              label: txt("m0125"),
            },
            ...groups.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          ]}
        />
        <p className="mt-4 break-all text-xs text-muted-foreground">
          {txt("m0602")}
          {asset.original_name}
        </p>
        <div className="mt-6 flex justify-end gap-3 border-t pt-5">
          <Button disabled={saving} onClick={onClose}>
            {txt("m0217")}
          </Button>
          <Button htmlType="submit" type="primary" loading={saving} disabled={!name.trim()}>
            {txt("m0465")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
