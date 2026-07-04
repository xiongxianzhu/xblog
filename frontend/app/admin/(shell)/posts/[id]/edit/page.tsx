"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { Button } from "@/components/ui/button";
import { getAdminPost, updatePost } from "@/lib/api";

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = Number(params.id);
  const { data: post, error, isLoading } = useSWR(postId ? `admin-post-${postId}` : null, () => getAdminPost(postId));
  const [message, setMessage] = useState("");

  async function handleSubmit(values: Record<string, unknown>) {
    setMessage("");
    try {
      await updatePost(postId, values);
      setMessage("已保存");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">无法加载文章，请确认已登录。</p>
        <Button asChild>
          <Link href="/admin">去登录</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || !post) {
    return <p className="text-muted-foreground">加载中…</p>;
  }

  return (
    <div>
      <AdminPageHeader
        title="编辑文章"
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/posts">返回列表</Link>
          </Button>
        }
      />
      {message ? <p className="mb-4 text-sm text-muted-foreground">{message}</p> : null}
      <PostEditorForm
        initial={{
          title: post.title,
          slug: post.slug,
          content_md: post.content_md,
          excerpt: post.excerpt ?? "",
          cover_url: post.cover_url ?? "",
          status: post.status,
          tag_slugs: post.tags.map((tag) => tag.slug),
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
