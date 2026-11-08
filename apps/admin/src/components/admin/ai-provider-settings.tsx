import { Loader2Icon, Pencil, PlugZap, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import {
  ACTIVE_FILTER_OPTIONS,
  AdminListFilter,
  BOOLEAN_FILTER_OPTIONS,
} from "@/components/admin/admin-list-filter";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { ADMIN_DEFAULT_PAGE_SIZE, AdminPagination } from "@/components/admin/admin-pagination";
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
import { getAdminErrorMessage } from "@/lib/admin-errors";
import {
  type AiProvider,
  type AiProviderType,
  createAiProvider,
  deleteAiProvider,
  getProviderTypeLabel,
  listAiProviders,
  PROVIDER_TEMPLATES,
  testAiProvider,
  updateAiProvider,
} from "@/lib/ai-api";
import { toast } from "@/lib/feedback";
import { matchQuery } from "@/lib/match-query";
import { useAdminMessages } from "@/lib/use-admin-messages";

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
  const txt = useAdminMessages();
  const { data, error, isLoading, mutate } = useSWR("ai-providers", listAiProviders);
  const [filters, setFilters] = useState({
    provider_type: "",
    enabled: "",
    is_default: "",
    has_api_key: "",
  });
  const [search, setSearch] = useState("");
  const [requestedPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AiProvider | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiProvider | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (provider) =>
          (!filters.provider_type || provider.provider_type === filters.provider_type) &&
          (!filters.enabled || String(provider.enabled) === filters.enabled) &&
          (!filters.is_default || String(provider.is_default) === filters.is_default) &&
          (!filters.has_api_key || String(provider.has_api_key) === filters.has_api_key) &&
          matchQuery(
            search,
            provider.name,
            provider.model,
            provider.provider_type,
            getProviderTypeLabel(provider.provider_type),
            provider.enabled ? txt("m0423") : txt("m0424"),
            provider.is_default ? txt("m0425") : "",
            provider.has_api_key ? txt("m0426") : txt("m0427"),
          ),
      ),
    [data, search, filters, txt],
  );
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);
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
          throw new Error(txt("m0428"));
        }
        payload.api_key = form.api_key.trim();
        await createAiProvider(payload);
      }
      setOpen(false);
      await mutate();
      toast.success(editing ? txt("m0429") : txt("m0430"), {
        description: txt("m0431", {
          p0: form.name.trim(),
          p1: editing ? txt("m0432") : txt("m0433"),
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
  const [changingProvider, setChangingProvider] = useState<string | null>(null);
  async function changeFlags(
    id: string,
    flags: {
      enabled?: boolean;
      is_default?: boolean;
    },
  ) {
    setChangingProvider(id);
    try {
      await updateAiProvider(id, flags);
      await mutate();
    } catch (err) {
      toast.error(txt("m0435"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setChangingProvider(null);
    }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAiProvider(deleteTarget.id);
      await mutate();
      toast.success(txt("m0437"), {
        description: txt("m0438", {
          p0: deleteTarget.name,
        }),
      });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(txt("m0049"), {
        description: getAdminErrorMessage(err),
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
        toast.success(txt("m0439"), {
          description: txt("m0440", {
            p0: result.latency_ms,
            p1: provider.name,
          }),
        });
      } else {
        toast.error(txt("m0441"), {
          description: getAdminErrorMessage(result.message, "aiFailed"),
        });
      }
    } catch (err) {
      toast.error(txt("m0441"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setTestingId(null);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{txt("m0442")}</p>
        <Button onClick={openCreate}>{txt("m0443")}</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminListSearch
          value={search}
          onChange={changeSearch}
          placeholder={txt("m0444")}
          className="w-72 max-w-full shrink-0"
        />

        <AdminListFilter
          label={txt("m0445")}
          value={filters.provider_type}
          options={Object.keys(PROVIDER_TEMPLATES).map((value) => ({
            value,
            label: getProviderTypeLabel(value as AiProviderType),
          }))}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              provider_type: value,
            }));
            setPage(1);
          }}
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
          label={txt("m0446")}
          value={filters.is_default}
          options={BOOLEAN_FILTER_OPTIONS}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              is_default: value,
            }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label={txt("m0447")}
          value={filters.has_api_key}
          options={BOOLEAN_FILTER_OPTIONS}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              has_api_key: value,
            }));
            setPage(1);
          }}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{txt("m0448")}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{txt("m0449")}</CardTitle>
          <CardDescription>{txt("m0450")}</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{txt("m0222")}</p>
          ) : (
            <>
              <Table className="admin-ai-list-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{txt("m0061")}</TableHead>
                    <TableHead>{txt("m0451")}</TableHead>
                    <TableHead>{txt("m0452")}</TableHead>
                    <TableHead>{txt("m0795")}</TableHead>
                    <TableHead>{txt("m0423")}</TableHead>
                    <TableHead>{txt("m0425")}</TableHead>
                    <TableHead className="text-right">{txt("m0063")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{getProviderTypeLabel(provider.provider_type)}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{provider.model}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                        {provider.has_api_key ? provider.masked_api_key || "********" : txt("m0427")}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={provider.enabled}
                          aria-label={txt("m0453", {
                            p0: provider.name,
                          })}
                          disabled={changingProvider !== null}
                          onCheckedChange={(enabled) =>
                            void changeFlags(provider.id, {
                              enabled,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={provider.is_default}
                          aria-label={txt("m0454", {
                            p0: provider.name,
                          })}
                          disabled={changingProvider !== null}
                          onCheckedChange={(checked) =>
                            void changeFlags(
                              provider.id,
                              checked
                                ? {
                                    is_default: true,
                                    enabled: true,
                                  }
                                : {
                                    is_default: false,
                                  },
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          aria-label={txt("m0065", {
                            p0: provider.name,
                          })}
                          title={txt("m0039")}
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(provider)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          aria-label={txt("m0455", {
                            p0: provider.name,
                          })}
                          title={txt("m0456")}
                          variant="ghost"
                          size="icon"
                          disabled={testingId === provider.id || !provider.has_api_key}
                          onClick={() => handleTest(provider)}
                        >
                          {testingId === provider.id ? <Loader2Icon className="animate-spin" /> : <PlugZap />}
                        </Button>
                        <Button
                          aria-label={txt("m0066", {
                            p0: provider.name,
                          })}
                          title={txt("m0067")}
                          variant="ghost"
                          className="text-destructive"
                          size="icon"
                          onClick={() => setDeleteTarget(provider)}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {txt("m0457")}
                        <Button variant="ghost" size="sm" className="h-auto px-1" onClick={openCreate}>
                          {txt("m0458")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {data?.length && !filtered.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {txt("m0056")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <AdminPagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? txt("m0459") : txt("m0443")}</DialogTitle>
            <DialogDescription>{txt("m0460")}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>{txt("m0061")}</FieldLabel>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    name: e.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>{txt("m0451")}</FieldLabel>
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
              <FieldLabel>{txt("m0794")}</FieldLabel>
              <Input
                value={form.base_url}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    base_url: e.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>{txt("m0452")}</FieldLabel>
              <Input
                value={form.model}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    model: e.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>{txt("m0795")}</FieldLabel>
              <Input
                type="password"
                value={form.api_key}
                placeholder={editing?.has_api_key ? txt("m0461") : txt("m0462")}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    api_key: e.target.value,
                  }))
                }
              />
            </Field>
            <div className="flex items-center gap-6">
              <label htmlFor="provider-enabled" className="flex items-center gap-2 text-sm">
                <Switch
                  id="provider-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({
                      ...p,
                      enabled: checked,
                    }))
                  }
                />
                {txt("m0423")}
              </label>
              <label htmlFor="provider-default" className="flex items-center gap-2 text-sm">
                <Switch
                  id="provider-default"
                  checked={form.is_default}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({
                      ...p,
                      is_default: checked,
                    }))
                  }
                />
                {txt("m0463")}
              </label>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {txt("m0217")}
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  {editing ? txt("m0015") : txt("m0464")}
                </>
              ) : editing ? (
                txt("m0465")
              ) : (
                txt("m0466")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
        title={txt("m0467")}
        description={
          deleteTarget
            ? txt("m0468", {
                p0: deleteTarget.name,
              })
            : ""
        }
        confirmLabel={txt("m0070")}
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
