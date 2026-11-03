import { useRef } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { createPost } from "@/lib/api";
import { useRouter } from "@/lib/navigation";

export default function NewPostPage() {
  const router = useRouter();
  const createdPostId = useRef<number | null>(null);

  async function handleSubmit(values: Record<string, unknown>) {
    const post = await createPost(values);
    createdPostId.current = post.id;
  }

  return (
    <div>
      <AdminPageHeader
        title="新建文章"
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/posts">返回列表</Link>
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
