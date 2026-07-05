"use client";

import Link from "next/link";
import useSWR from "swr";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PageEditorForm } from "@/components/admin/page-editor-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPage, updateAdminPage } from "@/lib/api";

type StaticPageSlug = "about" | "projects";

type StaticPageEditorProps = {
  slug: StaticPageSlug;
  title: string;
  description: string;
  previewPath: string;
};

export function StaticPageEditor({ slug, title, description, previewPath }: StaticPageEditorProps) {
  const swrKey = `admin-page-${slug}`;
  const { data: page, error, isLoading, mutate } = useSWR(swrKey, () => getAdminPage(slug));

  async function handleSubmit(values: { title: string; content_md: string }) {
    await updateAdminPage(slug, values);
  }

  return (
    <div>
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <Button asChild variant="outline">
            <Link href={previewPath} target="_blank" rel="noreferrer">
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
          previewPath={previewPath}
          onSubmit={handleSubmit}
          onSuccess={() => void mutate()}
        />
      ) : null}
    </div>
  );
}
