"use client";

import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AdminListSearch } from "@/components/admin/admin-list-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createAiSkill,
  deleteAiSkill,
  getAiSkillContent,
  getAiSkillDefaults,
  listAiSkills,
  updateAiSkill,
  updateAiSkillContent,
  updateAiSkillDefaults,
  uploadAiSkill,
  type AiSkill,
} from "@/lib/ai-api";
import { matchQuery } from "@/lib/match-query";

function sortSkills(skills: AiSkill[]) {
  return [...skills].sort((a, b) => a.name.localeCompare(b.name));
}

function upsertSkillInList(list: AiSkill[] | undefined, skill: AiSkill) {
  const current = list ?? [];
  const index = current.findIndex((item) => item.id === skill.id || item.name === skill.name);
  if (index >= 0) {
    const next = [...current];
    next[index] = skill;
    return sortSkills(next);
  }
  return sortSkills([...current, skill]);
}

export function AiSkillSettings() {
  const { data, error, isLoading, mutate } = useSWR("ai-skills", listAiSkills);
  const { data: defaults, mutate: mutateDefaults } = useSWR("ai-skill-defaults", getAiSkillDefaults);
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editing, setEditing] = useState<AiSkill | null>(null);
  const [skillContent, setSkillContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refreshSkills() {
    return mutate(async () => listAiSkills(), { revalidate: false, populateCache: true });
  }

  async function patchSkillsCache(updater: (current: AiSkill[] | undefined) => AiSkill[]) {
    await mutate(updater, { revalidate: false });
  }

  async function handleUpload(file: File) {
    try {
      const uploaded = await uploadAiSkill(file);
      await patchSkillsCache((current) => upsertSkillInList(current, uploaded));
      toast.success("上传成功", { description: `Skill 包「${file.name}」已导入。` });
    } catch (err) {
      toast.error("上传失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    }
  }

  async function handleCreate() {
    setSaving(true);
    const name = newName.trim();
    const description = newDescription.trim();
    try {
      const created = await createAiSkill({ name, description });
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setSearch("");
      await patchSkillsCache((current) => upsertSkillInList(current, created));
      toast.success("创建成功", { description: `Skill「${name}」已添加。` });
    } catch (err) {
      toast.error("创建失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    } finally {
      setSaving(false);
    }
  }

  async function openEditor(skill: AiSkill) {
    setEditing(skill);
    const { content } = await getAiSkillContent(skill.id);
    setSkillContent(content);
    setEditOpen(true);
  }

  async function openViewer(skill: AiSkill) {
    setEditing(skill);
    const { content } = await getAiSkillContent(skill.id);
    setSkillContent(content);
    setViewOpen(true);
  }

  async function handleSaveContent() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateAiSkillContent(editing.id, skillContent);
      setEditOpen(false);
      await refreshSkills();
      toast.success("保存成功", { description: `Skill「${editing.name}」内容已更新。` });
    } catch (err) {
      toast.error("保存失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(skill: AiSkill, enabled: boolean) {
    if (skill.is_builtin) return;
    const updated = await updateAiSkill(skill.id, { enabled });
    await patchSkillsCache((current) => upsertSkillInList(current, updated));
  }

  async function handleDelete(skill: AiSkill) {
    if (skill.is_builtin || deletingId) return;
    setDeletingId(skill.id);
    try {
      await deleteAiSkill(skill.id);
      await mutate(
        (current) => (current ?? []).filter((item) => item.id !== skill.id),
        { revalidate: false },
      );
      await mutateDefaults();
      toast.success("删除成功", { description: `Skill「${skill.name}」已移除。` });
    } catch (err) {
      toast.error("删除失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDefaultChange(scene: "polish" | "chat" | "generate", value: string) {
    await updateAiSkillDefaults({ [scene]: value === "none" ? null : value });
    await mutateDefaults();
  }

  const skillOptions = data ?? [];
  const filteredSkills = useMemo(
    () =>
      skillOptions.filter((skill) =>
        matchQuery(
          search,
          skill.name,
          skill.description,
          skill.is_builtin ? "内置" : "自定义",
        ),
      ),
    [skillOptions, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setCreateOpen(true)}>新建 Skill</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          上传 zip
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {error ? <p className="text-sm text-destructive">加载失败</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">场景默认 Skill</CardTitle>
          <CardDescription>未手动选择时，按场景使用默认 Skill 或 description 推荐。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {(["polish", "chat", "generate"] as const).map((scene) => (
            <Field key={scene}>
              <FieldLabel>{scene}</FieldLabel>
              <Select
                value={defaults?.[scene] ?? "none"}
                onValueChange={(value) => void handleDefaultChange(scene, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="无" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {skillOptions.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.is_builtin ? `${skill.name}（内置）` : skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill 列表</CardTitle>
          <CardDescription>
            内置 Skill 随系统提供、仅可查看；自定义 Skill 须符合 agentskills.io 规范。
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <AdminListSearch value={search} onChange={setSearch} placeholder="搜索 name、description…" className="mb-4" />
          {isLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>name</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>description</TableHead>
                  <TableHead>启用</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSkills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell className="font-mono text-sm">{skill.name}</TableCell>
                    <TableCell>
                      {skill.is_builtin ? (
                        <Badge variant="secondary">内置</Badge>
                      ) : (
                        <Badge variant="outline">自定义</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{skill.description}</TableCell>
                    <TableCell>
                      <Switch
                        checked={skill.enabled}
                        disabled={skill.is_builtin}
                        onCheckedChange={(checked) => handleToggle(skill, checked)}
                      />
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => openViewer(skill)}>
                        查看
                      </Button>
                      {!skill.is_builtin ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openEditor(skill)}>
                            编辑
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === skill.id}
                            onClick={() => void handleDelete(skill)}
                          >
                            {deletingId === skill.id ? (
                              <>
                                <Loader2Icon className="size-4 animate-spin" />
                                删除中…
                              </>
                            ) : (
                              "删除"
                            )}
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {!skillOptions.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暂无 Skill
                    </TableCell>
                  </TableRow>
                ) : null}
                {skillOptions.length > 0 && !filteredSkills.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      无匹配结果
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建 Skill</DialogTitle>
            <DialogDescription>name 仅允许小写字母、数字与连字符。</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>name</FieldLabel>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="blog-polish-zh" />
            </Field>
            <Field>
              <FieldLabel>description</FieldLabel>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button disabled={saving} onClick={handleCreate}>
              {saving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  创建中…
                </>
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>查看 SKILL.md</DialogTitle>
            <DialogDescription>
              {editing?.name}{" "}
              {editing?.is_builtin ? <Badge variant="secondary">内置 · 只读</Badge> : null}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={skillContent} readOnly className="min-h-[360px] font-mono text-sm" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑 SKILL.md</DialogTitle>
            <DialogDescription>
              {editing?.name} <Badge variant="secondary">agentskills.io</Badge>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={skillContent}
            onChange={(e) => setSkillContent(e.target.value)}
            className="min-h-[360px] font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button disabled={saving} onClick={handleSaveContent}>
              {saving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  保存中…
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
