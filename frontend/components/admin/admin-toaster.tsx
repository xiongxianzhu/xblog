"use client";

import { useEffect } from "react";
import { CircleCheckIcon, CircleXIcon } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import { useAdminTheme } from "@/components/admin/theme-provider";

const THEME_VARS = [
  "--background",
  "--foreground",
  "--border",
  "--primary",
  "--destructive",
  "--muted",
  "--muted-foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--radius",
] as const;

export function AdminToaster() {
  const { resolvedMode, palette } = useAdminTheme();

  useEffect(() => {
    function syncThemeVars() {
      const shell = document.querySelector("[data-admin-shell]");
      const toaster = document.querySelector("[data-sonner-toaster]");
      if (!shell || !toaster) return;

      const styles = getComputedStyle(shell);
      for (const key of THEME_VARS) {
        toaster.style.setProperty(key, styles.getPropertyValue(key));
      }
    }

    syncThemeVars();

    const shell = document.querySelector("[data-admin-shell]");
    if (!shell) return;

    const observer = new MutationObserver(syncThemeVars);
    observer.observe(shell, { attributes: true, attributeFilter: ["class", "data-admin-palette"] });
    return () => observer.disconnect();
  }, [resolvedMode, palette]);

  return (
    <Toaster
      theme={resolvedMode}
      className="admin-toaster"
      position="top-center"
      offset={16}
      gap={8}
      visibleToasts={3}
      closeButton
      icons={{
        success: <CircleCheckIcon />,
        error: <CircleXIcon />,
      }}
      toastOptions={{
        classNames: {
          toast: "admin-toast",
          content: "admin-toast-content",
          title: "admin-toast-title",
          description: "admin-toast-description",
          icon: "admin-toast-icon-wrap",
          closeButton: "admin-toast-close",
        },
      }}
    />
  );
}
