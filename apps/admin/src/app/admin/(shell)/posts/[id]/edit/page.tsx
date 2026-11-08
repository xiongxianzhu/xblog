import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { getAdminPost, updatePost } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function EditPostPage() {
  const txt = useAdminMessages();
  const params = useParams<{
    id: string;
  }>();
  const router = useRouter();
  const postId = Number(params.id);
  const {
    data: post,
    error,
    isLoading,
    mutate,
  } = useSWR(postId ? `admin-post-${postId}` : null, () => getAdminPost(postId));
  async function handleSubmit(values: Record<string, unknown>) {
    await updatePost(postId, values);
  }
  async function handleSuccess() {
    await mutate();
    router.refresh();
  }
  if (!Number.isInteger(postId) || postId <= 0) return <p className="text-destructive">{txt("m0219")}</p>;
  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{txt("m0220")}</p>
        <Button asChild>
          <Link href="/admin">{txt("m0221")}</Link>
        </Button>
      </div>
    );
  }
  if (isLoading || !post) {
    return <p className="text-muted-foreground">{txt("m0222")}</p>;
  }
  return (
    <div>
      <AdminPageHeader
        title={txt("m0167")}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/posts">{txt("m0186")}</Link>
          </Button>
        }
      />
      <PostEditorForm
        initial={{
          title: post.title,
          slug: post.slug,
          content_md: post.content_md,
          excerpt: post.excerpt ?? "",
          cover_url: post.cover_url ?? "",
          status: post.status,
          tags: post.tags.map((tag) => tag.name),
          is_pinned: post.is_pinned,
        }}
        onSubmit={handleSubmit}
        onSuccess={() => void handleSuccess()}
      />
    </div>
  );
}
