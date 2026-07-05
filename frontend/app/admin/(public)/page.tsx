import { Suspense } from "react";

import { AdminLoginScreen } from "@/components/admin/admin-login-screen";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginScreen />
    </Suspense>
  );
}
