import { AdminAuthGate } from "@/components/admin/auth-gate";

export default function AdminPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40 px-4 py-16">
      <AdminAuthGate>{children}</AdminAuthGate>
    </div>
  );
}
