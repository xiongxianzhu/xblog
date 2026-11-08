import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AiProviderSettings } from "@/components/admin/ai-provider-settings";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function AdminAiModelsPage() {
  const txt = useAdminMessages();
  return (
    <div>
      <AdminPageHeader title={txt("m0020")} description={txt("m0021")} />
      <AiProviderSettings />
    </div>
  );
}
