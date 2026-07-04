"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { Button } from "@/components/ui/button";
import { createPost } from "@/lib/api";

export default function NewPostPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(values: Record<string, unknown>) {
    setError("");
    try {
      const post = await createPost(values);
      router.push(`/admin/posts/${post.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
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
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <PostEditorForm onSubmit={handleSubmit} />
    </div>
  );
}
