"use client";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminSidebarProvider, useAdminSidebar } from "@/components/admin/admin-sidebar-provider";
import { cn } from "@/lib/utils";

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useAdminSidebar();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <AdminHeader />
      <div className="flex flex-1 pt-14">
        <AdminSidebar
          className={cn(
            "admin-sidebar-rail fixed bottom-0 left-0 top-14 z-30 hidden w-56 lg:flex",
            collapsed && "w-16",
          )}
        />
        <main
          className={cn(
            "admin-main-canvas min-w-0 flex-1 p-4 transition-[margin-left] duration-200 ease-out lg:ml-56 lg:p-6",
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
