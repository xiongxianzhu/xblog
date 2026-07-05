"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import { AdminListSearch } from "@/components/admin/admin-list-search";
import { UserAvatar } from "@/components/admin/user-avatar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { listAdminUsers } from "@/lib/api";
import { matchQuery } from "@/lib/match-query";
import { formatDateTime } from "@/lib/utils";

export default function AdminUsersPage() {
  const { data: users, error, isLoading } = useSWR("admin-users", listAdminUsers);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => (users ?? []).filter((user) => matchQuery(search, user.username, "管理员", "正常")),
    [users, search],
  );

  return (
    <div>
      <AdminPageHeader title="用户" description="当前为单管理员模式，多用户管理将在后续版本提供。" />

      <div className="mb-4">
        <AdminListSearch value={search} onChange={setSearch} placeholder="搜索用户名…" />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : filtered.length === 0 ? (
        <EmptyState title={(users ?? []).length === 0 ? "暂无用户" : "无匹配结果"} description="试试其他关键词。" />
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
                  <TableHead className="hidden sm:table-cell">角色</TableHead>
                  <TableHead className="hidden md:table-cell">状态</TableHead>
                  <TableHead className="hidden lg:table-cell">创建时间</TableHead>
                  <TableHead className="hidden xl:table-cell">最近登录</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <UserAvatar username={user.username} avatarUrl={user.avatar_url} size="sm" />
                    </TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="hidden sm:table-cell">管理员</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge>正常</Badge>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                      {formatDateTime(user.created_at)}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
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
