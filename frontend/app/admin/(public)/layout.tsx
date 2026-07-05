import { AdminAuthGate } from "@/components/admin/auth-gate";
import { AdminLoginBackground } from "@/components/admin/admin-login-background";

export default function AdminPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-login-canvas relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12">
      <AdminLoginBackground />
      <div className="relative z-10 flex w-full justify-center">
        <AdminAuthGate>{children}</AdminAuthGate>
      </div>
    </div>
  );
}
