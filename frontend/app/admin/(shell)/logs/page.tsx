import { redirect } from "next/navigation";

export default function AdminLogsIndexPage() {
  redirect("/admin/logs/operations");
}
