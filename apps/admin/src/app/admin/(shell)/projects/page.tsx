import { StaticPageEditor } from "@/components/admin/static-page-editor";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function AdminProjectsPage() {
  const txt = useAdminMessages();
  return (
    <StaticPageEditor
      slug="projects"
      title={txt("m0223")}
      description={txt("m0224")}
      previewPath="/projects"
    />
  );
}
