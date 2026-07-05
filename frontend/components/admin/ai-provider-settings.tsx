"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
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
import {
  PROVIDER_TEMPLATES,
  createAiProvider,
  deleteAiProvider,
  getProviderTypeLabel,
  listAiProviders,
  testAiProvider,
  updateAiProvider,
  type AiProvider,
  type AiProviderType,
} from "@/lib/ai-api";
import { matchQuery } from "@/lib/match-query";

type FormState = {
  name: string;
  provider_type: AiProviderType;
  base_url: string;
  model: string;
  api_key: string;
  enabled: boolean;
  is_default: boolean;
};

const emptyForm: FormState = {
  name: "",
  provider_type: "openai_compatible",
  base_url: PROVIDER_TEMPLATES.openai_compatible.base_url,
  model: PROVIDER_TEMPLATES.openai_compatible.model,
  api_key: "",
  enabled: false,
  is_default: false,
};

export function AiProviderSettings() {
  const { data, error, isLoading, mutate } = useSWR("ai-providers", listAiProviders);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AiProvider | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiProvider | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () =>
      (data ?? []).filter((provider) =>
        matchQuery(
          search,
          provider.name,
          provider.model,
          provider.provider_type,
          getProviderTypeLabel(provider.provider_type),
          provider.enabled ? "激活" : "未激活",
          provider.is_default ? "默认" : "",
          provider.has_api_key ? "已配置" : "未配置",
        ),
      ),
    [data, search],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(provider: AiProvider) {
    setEditing(provider);
    setForm({
      name: provider.name,
      provider_type: provider.provider_type,
      base_url: provider.base_url,
      model: provider.model,
      api_key: "",
      enabled: provider.enabled,
      is_default: provider.is_default,
    });
    setOpen(true);
  }

  function applyTemplate(type: AiProviderType) {
    const template = PROVIDER_TEMPLATES[type];
    setForm((prev) => ({
      ...prev,
      provider_type: type,
      base_url: template.base_url,
      model: template.model,
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        provider_type: form.provider_type,
        base_url: form.base_url,
        model: form.model,
        enabled: form.enabled,
        is_default: form.is_default,
      };
      if (form.api_key.trim()) {
        payload.api_key = form.api_key.trim();
      }
      if (editing) {
        await updateAiProvider(editing.id, payload);
      } else {
        if (!form.api_key.trim()) {
          throw new Error("新建提供商时请填写 API Key");
        }
        payload.api_key = form.api_key.trim();
        await createAiProvider(payload);
      }
      setOpen(false);
      await mutate();
      toast.success(editing ? "保存成功" : "创建成功", {
        description: `提供商「${form.name.trim()}」已${editing ? "更新" : "添加"}。`,
      });
    } catch (err) {
      toast.error("保存失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled(provider: AiProvider, enabled: boolean) {
    await updateAiProvider(provider.id, { enabled });
    await mutate();
  }

  async function handleSetDefault(provider: AiProvider) {
    await updateAiProvider(provider.id, { is_default: true, enabled: true });
    await mutate();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAiProvider(deleteTarget.id);
      await mutate();
      toast.success("删除成功", { description: `提供商「${deleteTarget.name}」已移除。` });
      setDeleteTarget(null);
    } catch (err) {
      toast.error("删除失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleTest(provider: AiProvider) {
    setTestingId(provider.id);
    try {
      const result = await testAiProvider(provider.id);
      if (result.ok) {
        toast.success("连接测试成功", {
          description: `延迟 ${result.latency_ms}ms · ${provider.name}`,
        });
      } else {
        toast.error("连接测试失败", { description: result.message });
      }
    } catch (err) {
      toast.error("连接测试失败", {
        description: err instanceof Error ? err.message : "请稍后重试",
      });
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          自行添加 LLM 提供商并激活后，编辑器 AI 功能才可用。API Key 仅保存在服务端。
        </p>
        <Button onClick={openCreate}>新建提供商</Button>
      </div>

      <AdminListSearch value={search} onChange={setSearch} placeholder="搜索名称、模型、类型…" className="mb-4" />

      {error ? <p className="text-sm text-destructive">加载失败</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">提供商列表</CardTitle>
          <CardDescription>至少激活一个并设为默认，才能在编辑器中使用 AI。</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>激活</TableHead>
                  <TableHead>默认</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>{getProviderTypeLabel(provider.provider_type)}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{provider.model}</TableCell>
                    <TableCell>{provider.has_api_key ? "已配置" : "未配置"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={provider.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(provider, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {provider.is_default ? (
                        <Badge>默认</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleSetDefault(provider)}>
                          设为默认
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(provider)}>
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={testingId === provider.id || !provider.has_api_key}
                        onClick={() => handleTest(provider)}
                      >
                        {testingId === provider.id ? (
                          <>
                            <Loader2Icon className="animate-spin" />
                            测试中…
                          </>
                        ) : (
                          "测试"
                        )}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(provider)}>
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      尚未配置提供商。
                      <Button variant="ghost" size="sm" className="h-auto px-1" onClick={openCreate}>
                        立即添加
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : null}
                {data?.length && !filtered.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      无匹配结果
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑提供商" : "新建提供商"}</DialogTitle>
            <DialogDescription>选择类型可自动填充建议 base URL，请按需修改。</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>名称</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>类型</FieldLabel>
              <Select
                value={form.provider_type}
                onValueChange={(value) => applyTemplate(value as AiProviderType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_TEMPLATES).map(([key, item]) => (
                    <SelectItem key={key} value={key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Base URL</FieldLabel>
              <Input value={form.base_url} onChange={(e) => setForm((p) => ({ ...p, base_url: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>模型</FieldLabel>
              <Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>API Key</FieldLabel>
              <Input
                type="password"
                value={form.api_key}
                placeholder={editing?.has_api_key ? "留空表示不修改" : "必填"}
                onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
              />
            </Field>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.enabled} onCheckedChange={(checked) => setForm((p) => ({ ...p, enabled: checked }))} />
                激活
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_default}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, is_default: checked }))}
                />
                设为默认
              </label>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  {editing ? "保存中…" : "创建中…"}
                </>
              ) : editing ? (
                "保存"
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
        title="删除提供商"
        description={
          deleteTarget
            ? `确定删除「${deleteTarget.name}」？删除后编辑器将无法使用该配置，此操作不可撤销。`
            : ""
        }
        confirmLabel="确认删除"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
