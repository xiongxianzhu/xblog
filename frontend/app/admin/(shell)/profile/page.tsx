"use client";

import Link from "next/link";
import useSWR from "swr";

import { AvatarEditor } from "@/components/admin/avatar-editor";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMe } from "@/lib/api";

export default function AdminProfilePage() {
  const { data: user, error, isLoading } = useSWR("admin-me", getMe);

  return (
    <div>
      <AdminPageHeader title="个人资料" description="管理头像与账号信息。" />

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
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
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
