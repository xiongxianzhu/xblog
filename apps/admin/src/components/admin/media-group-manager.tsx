import { Button, Drawer, Empty, Input } from "antd";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { toast } from "@/lib/feedback";
import { createMediaGroup, type MediaGroup, type MediaKind, renameMediaGroup } from "@/lib/media-api";
import { useAdminMessages } from "@/lib/use-admin-messages";
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
  const txt = useAdminMessages();
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
      toast.success(txt("m0603"), {
        id: "media-group",
      });
    } catch (err) {
      toast.error(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Drawer open title={txt("m0604")} size={440} onClose={() => !saving && onClose()} closable={!saving}>
      <p className="mb-5 text-sm text-muted-foreground">{txt("m0605")}</p>
      <form
        className="mb-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Input
          aria-label={txt("m0606")}
          placeholder={txt("m0607")}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={saving}
        />
        <Button htmlType="submit" type="primary" icon={<Plus size={16} />} disabled={!name.trim() || saving}>
          {txt("m0466")}
        </Button>
      </form>
      {!groups.length ? (
        <Empty description={txt("m0608")} />
      ) : (
        <ul className="m-0 list-none divide-y p-0">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center gap-2 py-3">
              {editing === group.id ? (
                <>
                  <Input
                    aria-label={txt("m0609")}
                    value={editName}
                    maxLength={80}
                    disabled={saving}
                    onChange={(event) => setEditName(event.target.value)}
                    onPressEnter={() => void save(group.id)}
                  />
                  <Button
                    type="text"
                    aria-label={txt("m0610")}
                    title={txt("m0465")}
                    icon={<Check size={16} />}
                    disabled={saving || !editName.trim()}
                    onClick={() => void save(group.id)}
                  />
                  <Button
                    type="text"
                    aria-label={txt("m0611")}
                    title={txt("m0217")}
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
                    title={txt("m0612")}
                    aria-label={txt("m0613", {
                      p0: group.name,
                    })}
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
                    title={txt("m0067")}
                    aria-label={txt("m0614", {
                      p0: group.name,
                    })}
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
