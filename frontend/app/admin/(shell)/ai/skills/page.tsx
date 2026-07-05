"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AiSkillSettings } from "@/components/admin/ai-skill-settings";

export default function AdminAiSkillsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Agent Skills"
        description="查看内置与用户自定义 Skill；内置 Skill 只读，自定义 Skill 可新建、编辑与删除。"
      />
      <AiSkillSettings />
    </div>
  );
}
