import { Upload } from "antd";
import { Eye, Loader2Icon, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import { ACTIVE_FILTER_OPTIONS, AdminListFilter } from "@/components/admin/admin-list-filter";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { ADMIN_DEFAULT_PAGE_SIZE, AdminPagination } from "@/components/admin/admin-pagination";
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
import { getAdminErrorMessage } from "@/lib/admin-errors";
import {
  type AiSkill,
  createAiSkill,
  deleteAiSkill,
  getAiSkillContent,
  getAiSkillDefaults,
  getSkillDescription,
  listAiSkills,
  updateAiSkill,
  updateAiSkillContent,
  updateAiSkillDefaults,
  uploadAiSkill,
} from "@/lib/ai-api";
import { toast } from "@/lib/feedback";
import { matchQuery } from "@/lib/match-query";
import { useAdminMessages } from "@/lib/use-admin-messages";

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
  const txt = useAdminMessages();
  const t = useTranslations("admin.skillScenes");
  const { data, error, isLoading, mutate } = useSWR("ai-skills", listAiSkills);
  const { data: defaults, mutate: mutateDefaults } = useSWR("ai-skill-defaults", getAiSkillDefaults);
  const [filters, setFilters] = useState({
    enabled: "",
    is_builtin: "",
  });
  const [search, setSearch] = useState("");
  const [requestedPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
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
    return mutate(async () => listAiSkills(), {
      revalidate: false,
      populateCache: true,
    });
  }
  async function patchSkillsCache(updater: (current: AiSkill[] | undefined) => AiSkill[]) {
    await mutate(updater, {
      revalidate: false,
    });
  }
  async function handleUpload(file: File) {
    try {
      const uploaded = await uploadAiSkill(file);
      await patchSkillsCache((current) => upsertSkillInList(current, uploaded));
      toast.success(txt("m0486"), {
        description: txt("m0487", {
          p0: file.name,
        }),
      });
    } catch (err) {
      toast.error(txt("m0110"), {
        description: getAdminErrorMessage(err),
      });
    }
  }
  async function handleCreate() {
    setSaving(true);
    const name = newName.trim();
    const description = newDescription.trim();
    try {
      const created = await createAiSkill({
        name,
        description,
      });
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      changeSearch("");
      await patchSkillsCache((current) => upsertSkillInList(current, created));
      toast.success(txt("m0430"), {
        description: txt("m0488", {
          p0: name,
        }),
      });
    } catch (err) {
      toast.error(txt("m0489"), {
        description: getAdminErrorMessage(err),
      });
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
      toast.success(txt("m0429"), {
        description: txt("m0490", {
          p0: editing.name,
        }),
      });
    } catch (err) {
      toast.error(txt("m0434"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  }
  async function handleToggle(skill: AiSkill, enabled: boolean) {
    if (skill.is_builtin) return;
    const updated = await updateAiSkill(skill.id, {
      enabled,
    });
    await patchSkillsCache((current) => upsertSkillInList(current, updated));
  }
  async function handleDelete(skill: AiSkill) {
    if (skill.is_builtin || deletingId) return;
    setDeletingId(skill.id);
    try {
      await deleteAiSkill(skill.id);
      await mutate((current) => (current ?? []).filter((item) => item.id !== skill.id), {
        revalidate: false,
      });
      await mutateDefaults();
      toast.success(txt("m0437"), {
        description: txt("m0491", {
          p0: skill.name,
        }),
      });
    } catch (err) {
      toast.error(txt("m0049"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setDeletingId(null);
    }
  }
  async function handleDefaultChange(scene: "polish" | "chat" | "generate", value: string) {
    await updateAiSkillDefaults({
      [scene]: value === "none" ? null : value,
    });
    await mutateDefaults();
  }
  const skillOptions = data ?? [];
  const filteredSkills = useMemo(
    () =>
      skillOptions.filter(
        (skill) =>
          (!filters.enabled || String(skill.enabled) === filters.enabled) &&
          (!filters.is_builtin || String(skill.is_builtin) === filters.is_builtin) &&
          matchQuery(
            search,
            skill.name,
            getSkillDescription(skill),
            skill.is_builtin ? txt("m0492") : txt("m0493"),
          ),
      ),
    [skillOptions, search, filters, txt],
  );
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(filteredSkills.length / pageSize)));
  const visibleRows = filteredSkills.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setCreateOpen(true)}>{txt("m0494")}</Button>
        <Upload
          accept=".zip,application/zip"
          showUploadList={false}
          beforeUpload={(file) => {
            void handleUpload(file);
            return false;
          }}
        >
          <Button variant="outline">{txt("m0495")}</Button>
        </Upload>
      </div>

      {error ? <p className="text-sm text-destructive">{txt("m0448")}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{txt("m0496")}</CardTitle>
          <CardDescription>{txt("m0497")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {(["polish", "chat", "generate"] as const).map((scene) => (
            <Field key={scene}>
              <FieldLabel>{t(scene)}</FieldLabel>
              <Select
                value={defaults?.[scene] ?? "none"}
                onValueChange={(value) => void handleDefaultChange(scene, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={txt("m0498")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{txt("m0498")}</SelectItem>
                  {skillOptions.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.is_builtin
                        ? txt("m0499", {
                            p0: skill.name,
                          })
                        : skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ))}
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminListSearch
          value={search}
          onChange={changeSearch}
          placeholder={txt("m0500")}
          className="w-72 max-w-full shrink-0"
        />

        <AdminListFilter
          label={txt("m0293")}
          value={filters.enabled}
          options={ACTIVE_FILTER_OPTIONS}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              enabled: value,
            }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label={txt("m0501")}
          value={filters.is_builtin}
          options={[
            {
              value: "true",
              label: txt("m0492"),
            },
            {
              value: "false",
              label: txt("m0493"),
            },
          ]}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              is_builtin: value,
            }));
            setPage(1);
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{txt("m0502")}</CardTitle>
          <CardDescription>{txt("m0503")}</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{txt("m0222")}</p>
          ) : (
            <>
              <Table className="admin-ai-list-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{txt("m0792")}</TableHead>
                    <TableHead>{txt("m0501")}</TableHead>
                    <TableHead>{txt("m0793")}</TableHead>
                    <TableHead>{txt("m0313")}</TableHead>
                    <TableHead className="text-right">{txt("m0063")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((skill) => (
                    <TableRow key={skill.id}>
                      <TableCell className="font-mono text-sm">{skill.name}</TableCell>
                      <TableCell>
                        <Badge variant={skill.is_builtin ? "default" : "secondary"}>
                          {skill.is_builtin ? txt("m0492") : txt("m0493")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{getSkillDescription(skill)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={skill.enabled}
                          disabled={skill.is_builtin}
                          onCheckedChange={(checked) => handleToggle(skill, checked)}
                        />
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          aria-label={txt("m0504", {
                            p0: skill.name,
                          })}
                          title={txt("m0505")}
                          variant="ghost"
                          size="icon"
                          onClick={() => openViewer(skill)}
                        >
                          <Eye />
                        </Button>
                        {!skill.is_builtin ? (
                          <>
                            <Button
                              aria-label={txt("m0065", {
                                p0: skill.name,
                              })}
                              title={txt("m0039")}
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditor(skill)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              aria-label={txt("m0066", {
                                p0: skill.name,
                              })}
                              title={txt("m0067")}
                              variant="ghost"
                              className="text-destructive"
                              size="icon"
                              disabled={deletingId === skill.id}
                              onClick={() => void handleDelete(skill)}
                            >
                              {deletingId === skill.id ? (
                                <Loader2Icon className="animate-spin" />
                              ) : (
                                <Trash2 />
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
                        {txt("m0506")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {skillOptions.length > 0 && !filteredSkills.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {txt("m0056")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <AdminPagination
                page={page}
                pageSize={pageSize}
                total={filteredSkills.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txt("m0494")}</DialogTitle>
            <DialogDescription>{txt("m0507")}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>{txt("m0792")}</FieldLabel>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="blog-polish-zh"
              />
            </Field>
            <Field>
              <FieldLabel>{txt("m0793")}</FieldLabel>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {txt("m0217")}
            </Button>
            <Button disabled={saving} onClick={handleCreate}>
              {saving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  {txt("m0464")}
                </>
              ) : (
                txt("m0466")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{txt("m0508")}</DialogTitle>
            <DialogDescription>
              {editing?.name} {editing?.is_builtin ? <Badge variant="secondary">{txt("m0509")}</Badge> : null}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={skillContent} readOnly className="min-h-[360px] font-mono text-sm" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              {txt("m0510")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{txt("m0511")}</DialogTitle>
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
              {txt("m0217")}
            </Button>
            <Button disabled={saving} onClick={handleSaveContent}>
              {saving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  {txt("m0015")}
                </>
              ) : (
                txt("m0465")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
