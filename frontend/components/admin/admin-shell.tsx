"use client";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminLoginSuccessToast } from "@/components/admin/admin-login-success-toast";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminSidebarProvider, useAdminSidebar } from "@/components/admin/admin-sidebar-provider";
import { cn } from "@/lib/utils";

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useAdminSidebar();

  return (
    <div className="flex min-h-[100dvh] min-w-0 flex-col overflow-x-clip">
      <AdminLoginSuccessToast />
      <AdminHeader />
      <div className="flex min-w-0 flex-1 pt-14">
        <AdminSidebar
          className={cn(
            "admin-sidebar-rail fixed bottom-0 left-0 top-14 z-30 hidden w-56 lg:flex",
            collapsed && "w-16",
          )}
        />
        <main
          className={cn(
            "admin-main-canvas min-w-0 max-w-full flex-1 p-4 transition-[margin-left] duration-200 ease-out sm:p-5 lg:ml-56 lg:p-6",
            collapsed && "lg:ml-16",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminSidebarProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminSidebarProvider>
  );
}
