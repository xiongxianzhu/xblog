import { Alert } from "antd";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { FriendLinkLogoEditor } from "@/components/admin/friend-link-logo-editor";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createAdminLink, updateAdminLink } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useRouter } from "@/lib/navigation";
import { discardManagedFriendLinkLogo } from "@/lib/pending-upload-cleanup";
import type { FriendLinkPublic } from "@/lib/types";
import { cn } from "@/lib/utils";

const adminFieldClass = cn(adminBorderlessControlClass, adminBorderlessFocusClass);
export function FriendLinkForm({ initial }: { initial?: FriendLinkPublic }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    url: initial?.url ?? "",
    logo_url: initial?.logo_url ?? "",
    description: initial?.description ?? "",
    sort_order: String(initial?.sort_order ?? 0),
  });
  const savedLogo = useRef(initial?.logo_url ?? "");
  const currentLogo = useRef(initial?.logo_url ?? "");
  const mounted = useRef(true);
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    mounted.current = true;
    const discard = () => {
      if (!busy.current) void discardManagedFriendLinkLogo(currentLogo.current, savedLogo.current);
    };
    window.addEventListener("pagehide", discard);
    return () => {
      mounted.current = false;
      window.removeEventListener("pagehide", discard);
      discard();
    };
  }, []);
  function changeLogo(url: string) {
    if (!mounted.current) {
      void discardManagedFriendLinkLogo(url, savedLogo.current);
      return;
    }
    const previous = currentLogo.current;
    currentLogo.current = url;
    if (previous !== url) void discardManagedFriendLinkLogo(previous, savedLogo.current);
    setForm((current) => ({ ...current, logo_url: url }));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || uploading) return;
    const sortOrder = Number(form.sort_order);
    if (!form.name.trim() || !form.url.trim() || !form.logo_url.trim()) {
      setError("名称、链接与 LOGO 不能为空。");
      return;
    }
    if (!Number.isSafeInteger(sortOrder)) {
      setError("排序必须是整数。");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        url: form.url.trim(),
        logo_url: form.logo_url.trim(),
        description: form.description.trim() || null,
        sort_order: sortOrder,
      };
      const saved = initial ? await updateAdminLink(initial.id, payload) : await createAdminLink(payload);
      savedLogo.current = saved.logo_url ?? payload.logo_url;
      await mutate("admin-links");
      if (mounted.current) {
        toast.success("友链已保存");
        router.push("/admin/links");
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "保存失败，请稍后重试");
      else void discardManagedFriendLinkLogo(currentLogo.current, savedLogo.current);
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>友链信息</CardTitle>
        <CardDescription>填写链接、LOGO 与简介，排序值越小越靠前。</CardDescription>
      </CardHeader>
      <form onSubmit={save} className="max-w-3xl">
        {error ? <Alert type="error" showIcon title={error} className="mb-5" /> : null}
        <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="link-name">名称</FieldLabel>
              <Input
                maxLength={100}
                id="link-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={adminFieldClass}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="link-url">链接 URL</FieldLabel>
              <Input
                maxLength={500}
                type="url"
                id="link-url"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://example.com"
                className={adminFieldClass}
                required
              />
            </Field>
            <Field>
              <FieldLabel>LOGO</FieldLabel>
              <FriendLinkLogoEditor
                value={form.logo_url}
                savedLogoUrl={savedLogo.current}
                onChange={changeLogo}
                disabled={saving}
                onUploadingChange={setUploading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="link-description">简介</FieldLabel>
              <Textarea
                id="link-description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="可选，展示在公开页友链卡片上"
                rows={3}
                maxLength={500}
                className={adminFieldClass}
              />
              <FieldDescription>可选，最多 500 字。</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="link-sort_order">排序</FieldLabel>
              <Input
                type="number"
                id="link-sort_order"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
                className={adminFieldClass}
              />
            </Field>
          </FieldGroup>
          <div className="mt-6 flex justify-end gap-3 border-t pt-5">
            <Button variant="outline" disabled={saving} onClick={() => router.push("/admin/links")}>
              取消
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "保存中…" : "保存友链"}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}
