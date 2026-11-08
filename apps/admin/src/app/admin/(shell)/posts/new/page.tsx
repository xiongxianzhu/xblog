import { useRef } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { createPost } from "@/lib/api";
import { useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function NewPostPage() {
  const txt = useAdminMessages();
  const router = useRouter();
  const createdPostId = useRef<number | null>(null);
  async function handleSubmit(values: Record<string, unknown>) {
    const post = await createPost(values);
    createdPostId.current = post.id;
  }
  return (
    <div>
      <AdminPageHeader
        title={txt("m0025")}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/posts">{txt("m0186")}</Link>
          </Button>
        }
      />
      <PostEditorForm
        onSubmit={handleSubmit}
        onSuccess={() => {
          if (createdPostId.current !== null) {
            router.push(`/admin/posts/${createdPostId.current}/edit`);
          }
        }}
      />
    </div>
  );
}
