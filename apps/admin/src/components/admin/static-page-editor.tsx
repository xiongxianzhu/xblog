import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PageEditorForm } from "@/components/admin/page-editor-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPage, updateAdminPage } from "@/lib/api";
import { useAdminMessages } from "@/lib/use-admin-messages";

type StaticPageSlug = "about" | "projects";
type StaticPageEditorProps = {
  slug: StaticPageSlug;
  title: string;
  description: string;
  previewPath: string;
};
export function StaticPageEditor({ slug, title, description, previewPath }: StaticPageEditorProps) {
  const txt = useAdminMessages();
  const swrKey = `admin-page-${slug}`;
  const { data: page, error, isLoading, mutate } = useSWR(swrKey, () => getAdminPage(slug));
  async function handleSubmit(values: { title: string; content_md: string }) {
    await updateAdminPage(slug, values);
  }
  return (
    <div>
      <AdminPageHeader title={title} description={description} />

      {isLoading ? <Skeleton className="h-96 w-full" /> : null}

      {error ? <p className="text-sm text-destructive">{txt("m0730")}</p> : null}

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
