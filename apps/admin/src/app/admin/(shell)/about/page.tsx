import { StaticPageEditor } from "@/components/admin/static-page-editor";
import { useAdminMessages } from "@/lib/use-admin-messages";
export default function AdminAboutPage() {
  const txt = useAdminMessages();
  return (
    <StaticPageEditor slug="about" title={txt("m0018")} description={txt("m0019")} previewPath="/about" />
  );
}
