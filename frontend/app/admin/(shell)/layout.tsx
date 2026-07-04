import { AdminAuthGate } from "@/components/admin/auth-gate";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGate>
  );
}
