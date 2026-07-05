"use client";

import { StaticPageEditor } from "@/components/admin/static-page-editor";

export default function AdminProjectsPage() {
  return (
    <StaticPageEditor
      slug="projects"
      title="作品集"
      description="编辑前台 /projects 页面内容。"
      previewPath="/projects"
    />
  );
}
