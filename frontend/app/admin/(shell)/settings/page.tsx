"use client";

import Link from "next/link";

import { PublicSiteThemeSettings } from "@/components/admin/public-site-theme-settings";
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
            <CardTitle className="text-base">公开站外观</CardTitle>
            <CardDescription>
              在此配置的主题会保存到服务器，所有访客看到相同外观。公开页不提供主题切换入口。
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
            <CardDescription>静态页面与友链可在后续版本接入可视化编辑。</CardDescription>
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
            详见仓库中的 <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.local.example</code> 与{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">backend/.env</code>。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
