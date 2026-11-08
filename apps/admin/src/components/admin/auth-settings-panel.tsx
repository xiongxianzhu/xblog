import { useState } from "react";
import useSWR from "swr";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { localizeAdminNotice } from "@/lib/admin-messages";
import { getAdminAuthSettings, updateAdminAuthSettings } from "@/lib/api";
import { useAdminMessages } from "@/lib/use-admin-messages";
export function AuthSettingsPanel() {
  const txt = useAdminMessages();
  const { data, error, isLoading, mutate } = useSWR("admin-auth-settings", getAdminAuthSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function toggle(
    key: "sms_enabled" | "github_enabled" | "wechat_enabled" | "turnstile_enabled",
    value: boolean,
  ) {
    if (!data || saving) return;
    setSaving(key);
    setMessage(null);
    try {
      const saved = await updateAdminAuthSettings({
        [key]: value,
      });
      await mutate(saved, false);
      setMessage(txt("m0520"));
    } catch {
      setMessage(txt("m0521"));
    } finally {
      setSaving(null);
    }
  }
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{txt("m0522")}</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{txt("m0053")}</p>;
  }
  return (
    <div className="space-y-5">
      <FieldGroup className="gap-5">
        <Field className="flex flex-row items-center justify-between gap-4 rounded-sm border border-border/70 px-4 py-3">
          <div className="space-y-1">
            <FieldLabel htmlFor="sms-enabled">{txt("m0523")}</FieldLabel>
            <FieldDescription>{data.sms_configured ? txt("m0524") : txt("m0525")}</FieldDescription>
          </div>
          <Switch
            id="sms-enabled"
            checked={data.sms_enabled}
            disabled={!data.sms_configured || saving === "sms_enabled"}
            onCheckedChange={(checked) => void toggle("sms_enabled", checked)}
          />
        </Field>

        <Field className="flex flex-row items-center justify-between gap-4 rounded-sm border border-border/70 px-4 py-3">
          <div className="space-y-1">
            <FieldLabel htmlFor="github-enabled">{txt("m0526")}</FieldLabel>
            <FieldDescription>{data.github_configured ? txt("m0527") : txt("m0528")}</FieldDescription>
          </div>
          <Switch
            id="github-enabled"
            checked={data.github_enabled}
            disabled={!data.github_configured || saving === "github_enabled"}
            onCheckedChange={(checked) => void toggle("github_enabled", checked)}
          />
        </Field>

        <Field className="flex flex-row items-center justify-between gap-4 rounded-sm border border-border/70 px-4 py-3">
          <div className="space-y-1">
            <FieldLabel htmlFor="wechat-enabled">{txt("m0529")}</FieldLabel>
            <FieldDescription>{data.wechat_configured ? txt("m0530") : txt("m0531")}</FieldDescription>
          </div>
          <Switch
            id="wechat-enabled"
            checked={data.wechat_enabled}
            disabled={!data.wechat_configured || saving === "wechat_enabled"}
            onCheckedChange={(checked) => void toggle("wechat_enabled", checked)}
          />
        </Field>

        <Field className="flex flex-row items-center justify-between gap-4 rounded-sm border border-border/70 px-4 py-3">
          <div className="space-y-1">
            <FieldLabel htmlFor="turnstile-enabled">{txt("m0532")}</FieldLabel>
            <FieldDescription>{data.turnstile_configured ? txt("m0533") : txt("m0534")}</FieldDescription>
          </div>
          <Switch
            id="turnstile-enabled"
            checked={data.turnstile_enabled}
            disabled={!data.turnstile_configured || saving === "turnstile_enabled"}
            onCheckedChange={(checked) => void toggle("turnstile_enabled", checked)}
          />
        </Field>
      </FieldGroup>

      {message ? <p className="text-sm text-muted-foreground">{localizeAdminNotice(message)}</p> : null}

      <p className="text-xs leading-relaxed text-muted-foreground">{txt("m0535")}</p>
    </div>
  );
}
