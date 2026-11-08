import { Button } from "antd";
import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { useAdminTheme } from "@/components/admin/theme-provider";
import {
  ADMIN_PALETTES,
  type AdminPaletteId,
  COLOR_MODE_OPTIONS,
  type ColorMode,
  type PaletteMeta,
  SITE_PALETTES,
  type SitePaletteId,
} from "@/lib/themes";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

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
  const txt = useAdminMessages();
  const { resolvedMode } = useAdminTheme();
  const previewDark = mode === "dark" || (mode === "system" && resolvedMode === "dark");
  const selectedPalette = palettes.find((item) => item.id === palette);
  const scopeLabel = scope === "site" ? txt("m0561") : txt("m0339");
  const modeOptions = allowSystem
    ? COLOR_MODE_OPTIONS
    : COLOR_MODE_OPTIONS.filter((item) => item.value !== "system");
  return (
    <div data-theme-settings={scope} className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{txt("m0745")}</p>
          <p className="text-xs text-muted-foreground">
            {scope === "site"
              ? txt("m0746")
              : txt("m0747", {
                  p0: scopeLabel,
                })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {modeOptions.map((item) => (
            <Button
              key={item.value}
              htmlType="button"
              disabled={disabled}
              aria-pressed={mode === item.value}
              onClick={() => onModeChange(item.value)}
              className={cn(
                "rounded-[2px] border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                mode === item.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{txt("m0748")}</p>
          <p className="text-xs text-muted-foreground">{txt("m0749")}</p>
        </div>
        <div className="admin-palette-grid">
          {palettes.map((item) => (
            <PaletteCard
              key={item.id}
              item={item}
              dark={previewDark}
              active={palette === item.id}
              disabled={disabled}
              onSelect={() => onPaletteChange(item.id)}
            />
          ))}
        </div>
        <p className="admin-palette-current" aria-live="polite">
          {txt("m0750")}
          <strong>{selectedPalette?.label ?? palette}</strong>
        </p>
      </div>
    </div>
  );
}
type PaletteCardProps<P extends string> = {
  item: PaletteMeta<P>;
  active: boolean;
  dark: boolean;
  disabled?: boolean;
  onSelect: () => void;
};
function PaletteCard<P extends string>({
  item,
  active,
  dark,
  disabled = false,
  onSelect,
}: PaletteCardProps<P>) {
  useAdminMessages();
  const previewStyle = {
    "--preview-paper": item.swatch[0],
    "--preview-accent": item.swatch[1],
    "--preview-ink": item.swatch[2],
  } as CSSProperties;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={active}
      aria-label={item.label}
      title={item.description}
      className="admin-palette-card admin-palette-preview-card"
      style={previewStyle}
    >
      <span className="admin-palette-preview" data-dark={dark} aria-hidden="true">
        <span className="admin-palette-preview-sidebar">
          <span />
        </span>
        <span className="admin-palette-preview-workspace">
          <span className="admin-palette-preview-header" />
          <span className="admin-palette-preview-panels">
            <span>
              <i />
            </span>
            <span />
          </span>
        </span>
      </span>
      <span className="admin-palette-caption">
        <span>{item.label}</span>
        {active ? <Check size={14} aria-hidden /> : null}
      </span>
    </button>
  );
}
export function SiteThemeSettingsPanel(
  props: Omit<ThemeSettingsPanelProps<SitePaletteId>, "palettes" | "scope">,
) {
  useAdminMessages();
  return <ThemeSettingsPanel {...props} scope="site" palettes={SITE_PALETTES} />;
}
export function AdminThemeSettingsPanel(
  props: Omit<ThemeSettingsPanelProps<AdminPaletteId>, "palettes" | "scope">,
) {
  useAdminMessages();
  return <ThemeSettingsPanel {...props} scope="admin" palettes={ADMIN_PALETTES} />;
}
