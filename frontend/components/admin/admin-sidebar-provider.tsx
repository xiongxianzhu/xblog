"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "xblog-admin-sidebar-collapsed";

type AdminSidebarContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const AdminSidebarContext = createContext<AdminSidebarContextValue | null>(null);

export function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapsed,
    }),
    [collapsed, toggleCollapsed],
  );

  return <AdminSidebarContext.Provider value={value}>{children}</AdminSidebarContext.Provider>;
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error("useAdminSidebar must be used within AdminSidebarProvider");
  }
  return context;
}
