import { Button, Drawer, Empty, Input } from "antd";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/feedback";
import { createMediaGroup, type MediaGroup, type MediaKind, renameMediaGroup } from "@/lib/media-api";

export function MediaGroupManager({
  kind,
  groups,
  onClose,
  onChanged,
  onDelete,
}: {
  kind: MediaKind;
  groups: MediaGroup[];
  onClose: () => void;
  onChanged: () => Promise<unknown>;
  onDelete: (group: MediaGroup) => void;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(id?: number) {
    const value = (id === undefined ? name : editName).trim();
    if (!value || saving) return;
    setSaving(true);
    try {
      if (id === undefined) await createMediaGroup(kind, value);
      else await renameMediaGroup(id, value);
      setName("");
      setEditing(null);
      await onChanged();
      toast.success("分组已保存", { id: "media-group" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Drawer open title="分组管理" size={440} onClose={() => !saving && onClose()} closable={!saving}>
      <p className="mb-5 text-sm text-muted-foreground">
        分组仅用于当前素材类型。删除分组后，其中的素材会移入“未分组”。
      </p>
      <form
        className="mb-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Input
          aria-label="新分组名称"
          placeholder="输入新分组名称"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={saving}
        />
        <Button htmlType="submit" type="primary" icon={<Plus size={16} />} disabled={!name.trim() || saving}>
          创建
        </Button>
      </form>
      {!groups.length ? (
        <Empty description="暂无自定义分组" />
      ) : (
        <ul className="m-0 list-none divide-y p-0">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center gap-2 py-3">
              {editing === group.id ? (
                <>
                  <Input
                    aria-label="分组名称"
                    value={editName}
                    maxLength={80}
                    disabled={saving}
                    onChange={(event) => setEditName(event.target.value)}
                    onPressEnter={() => void save(group.id)}
                  />
                  <Button
                    type="text"
                    aria-label="保存分组名称"
                    title="保存"
                    icon={<Check size={16} />}
                    disabled={saving || !editName.trim()}
                    onClick={() => void save(group.id)}
                  />
                  <Button
                    type="text"
                    aria-label="取消重命名"
                    title="取消"
                    icon={<X size={16} />}
                    disabled={saving}
                    onClick={() => setEditing(null)}
                  />
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 break-words text-sm">
                    {group.name}
                    <span className="ml-2 text-muted-foreground">({group.count})</span>
                  </span>
                  <Button
                    type="text"
                    title="重命名"
                    aria-label={`重命名分组 ${group.name}`}
                    icon={<Pencil size={16} />}
                    disabled={saving}
                    onClick={() => {
                      setEditing(group.id);
                      setEditName(group.name);
                    }}
                  />
                  <Button
                    type="text"
                    danger
                    title="删除"
                    aria-label={`删除分组 ${group.name}`}
                    icon={<Trash2 size={16} />}
                    disabled={saving}
                    onClick={() => onDelete(group)}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
