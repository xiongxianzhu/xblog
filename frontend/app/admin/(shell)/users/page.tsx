"use client";

import useSWR from "swr";

import { UserAvatar } from "@/components/admin/user-avatar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminUsers } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

export default function AdminUsersPage() {
  const { data: users, error, isLoading } = useSWR("admin-users", listAdminUsers);

  return (
    <div>
      <AdminPageHeader title="用户" description="当前为单管理员模式，多用户管理将在后续版本提供。" />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">管理员账号</CardTitle>
            <CardDescription>通过 CLI 创建：`uv run python -m app.cli create-admin`</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">头像</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>最近登录</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <UserAvatar username={user.username} avatarUrl={user.avatar_url} size="sm" />
                    </TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>管理员</TableCell>
                    <TableCell>
                      <Badge>正常</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(user.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(user.last_login_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
