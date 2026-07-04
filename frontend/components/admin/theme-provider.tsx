"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  ADMIN_PALETTES,
  ADMIN_THEME_STORAGE_KEY,
  type AdminPaletteId,
  type ColorMode,
  colorModeLabel,
  isAdminPaletteId,
  readThemeSettings,
  resolveColorMode,
  type ResolvedColorMode,
  type ThemeSettings,
  writeThemeSettings,
} from "@/lib/themes";

const LEGACY_STORAGE_KEY = "xblog-admin-theme";
const DEFAULT_PALETTE: AdminPaletteId = "slate";

type AdminThemeContextValue = {
  mode: ColorMode;
  palette: AdminPaletteId;
  resolvedMode: ResolvedColorMode;
  setMode: (mode: ColorMode) => void;
  setPalette: (palette: AdminPaletteId) => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings<AdminPaletteId>>({
    mode: "system",
    palette: DEFAULT_PALETTE,
  });
  const [resolvedMode, setResolvedMode] = useState<ResolvedColorMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(
      readThemeSettings(ADMIN_THEME_STORAGE_KEY, LEGACY_STORAGE_KEY, DEFAULT_PALETTE, new Set(ADMIN_PALETTES.map((p) => p.id))),
    );
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const next = resolveColorMode(settings.mode);
    setResolvedMode(next);

    if (settings.mode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedMode(resolveColorMode("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [ready, settings.mode]);

  const setMode = useCallback((mode: ColorMode) => {
    setSettings((prev) => {
      const next = { ...prev, mode };
      writeThemeSettings(ADMIN_THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setPalette = useCallback((palette: AdminPaletteId) => {
    if (!isAdminPaletteId(palette)) return;
    setSettings((prev) => {
      const next = { ...prev, palette };
      writeThemeSettings(ADMIN_THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      mode: settings.mode,
      palette: settings.palette,
      resolvedMode,
      setMode,
      setPalette,
    }),
    [settings.mode, settings.palette, resolvedMode, setMode, setPalette],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div
        data-admin-shell
        data-admin-palette={settings.palette}
        className={cn("min-h-[100dvh] bg-background text-foreground antialiased", resolvedMode === "dark" && "dark")}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return context;
}

export function useAdminThemeLabels() {
  const { mode, palette } = useAdminTheme();
  const paletteLabel = ADMIN_PALETTES.find((item) => item.id === palette)?.label ?? palette;
  return {
    modeLabel: colorModeLabel(mode),
    paletteLabel,
  };
}

/** @deprecated 使用 mode 代替 */
export type AdminTheme = ColorMode;
