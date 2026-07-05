"use client";

import Link from "next/link";

import { PublicSiteThemeSettings } from "@/components/admin/public-site-theme-settings";
import { AuthSettingsPanel } from "@/components/admin/auth-settings-panel";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminThemeSettingsPanel } from "@/components/theme/theme-settings-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  const { mode, palette, setMode, setPalette } = useAdminTheme();

  return (
    <div>
      <AdminPageHeader title="设置" description="站点与账号相关配置。" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">登录方式</CardTitle>
            <CardDescription>
              控制管理后台登录页可用的方式。Turnstile 需先在 .env 配置密钥后再开启；GitHub / 微信默认关闭；手机验证码需配置 SMS 并在个人资料绑定手机号。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSettingsPanel />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">公开站外观</CardTitle>
            <CardDescription>
              配置公开站品牌（名称、LOGO）、配色与明暗。品牌信息同步用于管理后台登录页；保存后所有访客看到相同外观。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublicSiteThemeSettings />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">后台外观</CardTitle>
            <CardDescription>
              仅影响当前浏览器中的管理后台，偏好保存在本机（键名 xblog-admin-theme-v2）。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminThemeSettingsPanel mode={mode} palette={palette} onModeChange={setMode} onPaletteChange={setPalette} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI 写作</CardTitle>
            <CardDescription>配置 LLM 提供商与 Agent Skills，在文章编辑器中使用选区 AI。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/admin/ai/models">AI 模型</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/ai/skills">Skills</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">账号安全</CardTitle>
            <CardDescription>修改登录密码，或重置 CLI 管理员密码。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/password">修改密码</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">站点内容</CardTitle>
            <CardDescription>静态页面与友链可在侧栏「关于」「作品集」「友链」中编辑。</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>当前可通过后端 CLI 初始化页面：</p>
            <code className="mt-2 block rounded-md bg-muted px-3 py-2 font-mono text-xs">
              uv run python -m app.cli seed-pages
            </code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">环境变量</CardTitle>
            <CardDescription>前端通过 BACKEND_URL 代理 API，后端使用 DATABASE_URL 与 SECRET_KEY。</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            复制 <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">frontend/.env.example</code> 为{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">frontend/.env</code>；后端见{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">backend/.env.example</code>。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
