"use client";

import { useState } from "react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { getAdminAuthSettings, updateAdminAuthSettings } from "@/lib/api";

export function AuthSettingsPanel() {
  const { data, error, isLoading, mutate } = useSWR("admin-auth-settings", getAdminAuthSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(
    key: "sms_enabled" | "github_enabled" | "wechat_enabled",
    value: boolean,
  ) {
    if (!data || saving) return;
    setSaving(key);
    setMessage(null);
    try {
      const saved = await updateAdminAuthSettings({ [key]: value });
      await mutate(saved, false);
      setMessage("登录方式已更新。");
    } catch {
      setMessage("保存失败，请稍后重试。");
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">加载登录配置…</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">加载失败，请刷新页面。</p>;
  }

  return (
    <div className="space-y-5">
      <FieldGroup className="gap-5">
        <Field className="flex flex-row items-center justify-between gap-4 rounded-sm border border-border/70 px-4 py-3">
          <div className="space-y-1">
            <FieldLabel htmlFor="sms-enabled">手机验证码登录</FieldLabel>
            <FieldDescription>
              {data.sms_configured
                ? "开启后登录页显示手机号 + 验证码；需先在个人资料绑定手机号。"
                : "请先在 backend/.env 配置 SMS_PROVIDER（开发环境默认 dev，验证码输出到后端日志）。"}
            </FieldDescription>
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
            <FieldLabel htmlFor="github-enabled">GitHub 登录</FieldLabel>
            <FieldDescription>
              {data.github_configured
                ? "开启后登录页与个人资料页显示 GitHub 登录/绑定入口。"
                : "请先在 backend/.env 配置 GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET。"}
            </FieldDescription>
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
            <FieldLabel htmlFor="wechat-enabled">微信登录</FieldLabel>
            <FieldDescription>
              {data.wechat_configured
                ? "开启后登录页与个人资料页显示微信登录/绑定入口。"
                : "请先在 backend/.env 配置 WECHAT_APP_ID 与 WECHAT_APP_SECRET。"}
            </FieldDescription>
          </div>
          <Switch
            id="wechat-enabled"
            checked={data.wechat_enabled}
            disabled={!data.wechat_configured || saving === "wechat_enabled"}
            onCheckedChange={(checked) => void toggle("wechat_enabled", checked)}
          />
        </Field>
      </FieldGroup>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        默认仅开放账号密码登录。第三方登录需先在个人资料中绑定对应账号；手机登录需绑定手机号并在开发环境查看 backend 日志获取验证码。
      </p>
    </div>
  );
}
