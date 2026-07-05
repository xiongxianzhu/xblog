"use client";

import { cn } from "@/lib/utils";
import {
  ADMIN_PALETTES,
  COLOR_MODE_OPTIONS,
  SITE_PALETTES,
  type AdminPaletteId,
  type ColorMode,
  type PaletteMeta,
  type SitePaletteId,
} from "@/lib/themes";

type ThemeSettingsPanelProps<P extends string> = {
  scope: "site" | "admin";
  mode: ColorMode;
  palette: P;
  palettes: PaletteMeta<P>[];
  onModeChange: (mode: ColorMode) => void;
  onPaletteChange: (palette: P) => void;
  allowSystem?: boolean;
  disabled?: boolean;
  className?: string;
};

export function ThemeSettingsPanel<P extends string>({
  scope,
  mode,
  palette,
  palettes,
  onModeChange,
  onPaletteChange,
  allowSystem = true,
  disabled = false,
  className,
}: ThemeSettingsPanelProps<P>) {
  const scopeLabel = scope === "site" ? "公开站" : "管理后台";
  const modeOptions = allowSystem ? COLOR_MODE_OPTIONS : COLOR_MODE_OPTIONS.filter((item) => item.value !== "system");

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">亮度</p>
          <p className="text-xs text-muted-foreground">
            {scope === "site"
              ? "全站统一外观，所有访客看到相同主题。"
              : `仅影响${scopeLabel}，与公开站主题互不影响。`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {modeOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(item.value)}
              className={cn(
                "rounded-[2px] border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                mode === item.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">配色</p>
          <p className="text-xs text-muted-foreground">选择一套预设配色方案。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {palettes.map((item) => (
            <PaletteCard
              key={item.id}
              item={item}
              active={palette === item.id}
              disabled={disabled}
              onSelect={() => onPaletteChange(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type PaletteCardProps<P extends string> = {
  item: PaletteMeta<P>;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

function PaletteCard<P extends string>({ item, active, disabled = false, onSelect }: PaletteCardProps<P>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-3 rounded-[2px] border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/30 hover:bg-accent/40",
      )}
    >
      <span className="mt-0.5 flex shrink-0 overflow-hidden rounded-[2px] border border-border/80">
        {item.swatch.map((color) => (
          <span key={color} className="size-4" style={{ backgroundColor: color }} aria-hidden />
        ))}
      </span>
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-medium">{item.label}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{item.description}</span>
      </span>
    </button>
  );
}

export function SiteThemeSettingsPanel(props: Omit<ThemeSettingsPanelProps<SitePaletteId>, "palettes" | "scope">) {
  return <ThemeSettingsPanel {...props} scope="site" palettes={SITE_PALETTES} />;
}

export function AdminThemeSettingsPanel(props: Omit<ThemeSettingsPanelProps<AdminPaletteId>, "palettes" | "scope">) {
  return <ThemeSettingsPanel {...props} scope="admin" palettes={ADMIN_PALETTES} />;
}
