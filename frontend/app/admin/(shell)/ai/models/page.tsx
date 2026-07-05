"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AiProviderSettings } from "@/components/admin/ai-provider-settings";

export default function AdminAiModelsPage() {
  return (
    <div>
      <AdminPageHeader
        title="AI 模型"
        description="管理 LLM 提供商：新增、编辑、激活与设置默认模型。API Key 仅保存在服务端。"
      />
      <AiProviderSettings />
    </div>
  );
}
