import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AiSkillSettings } from "@/components/admin/ai-skill-settings";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function AdminAiSkillsPage() {
  const txt = useAdminMessages();
  return (
    <div>
      <AdminPageHeader title={txt("m0791")} description={txt("m0022")} />
      <AiSkillSettings />
    </div>
  );
}
