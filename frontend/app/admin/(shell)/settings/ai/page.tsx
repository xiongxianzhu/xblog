import { redirect } from "next/navigation";

export default function AdminAiSettingsRedirectPage() {
  redirect("/admin/ai/models");
}
