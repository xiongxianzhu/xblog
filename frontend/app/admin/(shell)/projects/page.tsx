"use client";

import Link from "next/link";
import useSWR from "swr";

import { PageEditorForm } from "@/components/admin/page-editor-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPage, updateAdminPage } from "@/lib/api";

export default function AdminProjectsPage() {
  const { data: page, error, isLoading } = useSWR("admin-page-projects", () => getAdminPage("projects"));

  async function handleSubmit(values: { title: string; content_md: string }) {
    await updateAdminPage("projects", values);
  }

  return (
    <div>
      <AdminPageHeader
        title="作品集"
        description="编辑前台 /projects 页面内容。"
        actions={
          <Button asChild variant="outline">
            <Link href="/projects" target="_blank" rel="noreferrer">
              预览前台
            </Link>
          </Button>
        }
      />

      {isLoading ? <Skeleton className="h-96 w-full" /> : null}

      {error ? (
        <p className="text-sm text-destructive">
          无法加载页面。若尚未初始化，请在后端运行 `uv run python -m app.cli seed-pages`。
        </p>
      ) : null}

      {page ? (
        <PageEditorForm
          initial={{
            title: page.title,
            content_md: page.content_md,
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}
