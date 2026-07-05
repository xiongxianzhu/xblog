"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { AdminOAuthButtons } from "@/components/admin/admin-oauth-buttons";
import { AvatarEditor } from "@/components/admin/avatar-editor";
import { PhoneBinder } from "@/components/admin/phone-binder";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getMe, getOAuthLinks, getOAuthProviders } from "@/lib/api";

function ProfileContent() {
  const searchParams = useSearchParams();
  const { data: user, error, isLoading, mutate } = useSWR("admin-me", getMe);
  const { data: providers } = useSWR("oauth-providers", getOAuthProviders);
  const { data: links, mutate: mutateLinks } = useSWR("oauth-links", getOAuthLinks);

  useEffect(() => {
    if (searchParams.get("oauth") === "bound") {
      toast.success("绑定成功", { description: "下次可使用第三方账号登录。" });
      void mutateLinks();
    }
  }, [searchParams, mutateLinks]);

  return (
    <div>
      <AdminPageHeader title="个人资料" description="管理头像、登录方式与账号信息。" />

      {isLoading ? (
        <Skeleton className="h-48 w-full max-w-lg" />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : user ? (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>{user.username}</CardTitle>
            <p className="text-sm text-muted-foreground">管理员</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <AvatarEditor username={user.username} avatarUrl={user.avatar_url} />

            <PhoneBinder
              phone={user.phone}
              onUpdated={(nextPhone) => {
                void mutate({ ...user, phone: nextPhone }, false);
              }}
            />

            {providers && (providers.github || providers.wechat) ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <div>
                  <p className="text-sm font-medium">第三方登录</p>
                  <p className="mt-1 text-xs text-muted-foreground">绑定后可在登录页使用 GitHub 或微信快捷登录。</p>
                </div>
                <AdminOAuthButtons providers={providers} mode="bind" links={links} />
              </div>
            ) : null}

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/password">修改密码</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/settings">站点设置</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full max-w-lg" />}>
      <ProfileContent />
    </Suspense>
  );
}
