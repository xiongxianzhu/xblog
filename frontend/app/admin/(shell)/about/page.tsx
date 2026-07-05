"use client";

import { StaticPageEditor } from "@/components/admin/static-page-editor";

export default function AdminAboutPage() {
  return (
    <StaticPageEditor
      slug="about"
      title="关于"
      description="编辑前台 /about 页面内容。"
      previewPath="/about"
    />
  );
}
