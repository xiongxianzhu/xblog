import { redirect } from "@/lib/navigation";

export default function AdminAiSettingsRedirectPage() {
  redirect("/admin/ai/models");
}
