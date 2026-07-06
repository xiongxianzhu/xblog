export type ColorMode = "light" | "dark" | "system";

export type ResolvedColorMode = "light" | "dark";

export type ThemePaletteId = "editorial" | "forest" | "slate" | "ink" | "graphite" | "ocean" | "rose";

export type SitePaletteId = ThemePaletteId;

export type AdminPaletteId = ThemePaletteId;

export type ThemeSettings<P extends string> = {
  mode: ColorMode;
  palette: P;
};

export type PaletteMeta<P extends string> = {
  id: P;
  label: string;
  description: string;
  swatch: [string, string, string];
};

export type SitePublicColorMode = "light" | "dark";

export type SitePublicTheme = {
  mode: SitePublicColorMode;
  palette: SitePaletteId;
  site_name: string;
  site_tagline: string;
  site_logo_url: string | null;
  site_icp_number: string | null;
  posts_per_page: number;
};

export const DEFAULT_SITE_THEME: SitePublicTheme = {
  mode: "light",
  palette: "editorial",
  site_name: "xblog",
  site_tagline: "Ink & Paper",
  site_logo_url: null,
  site_icp_number: null,
  posts_per_page: 10,
};

export const PUBLIC_POSTS_PER_PAGE_OPTIONS = [5, 10, 15, 20, 30, 50] as const;

export const ADMIN_THEME_STORAGE_KEY = "xblog-admin-theme-v2";

export const THEME_PALETTE_IDS: ThemePaletteId[] = [
  "editorial",
  "forest",
  "slate",
  "ink",
  "graphite",
  "ocean",
  "rose",
];

type PaletteCopy = Omit<PaletteMeta<ThemePaletteId>, "id">;

const SITE_PALETTE_COPY: Record<ThemePaletteId, PaletteCopy> = {
  editorial: {
    label: "墨纸",
    description: "暖色纸感与赭红点缀，适合博客阅读。",
    swatch: ["#f7f3eb", "#b54a3a", "#2a211c"],
  },
  forest: {
    label: "深林",
    description: "森绿与骨白，安静自然的阅读氛围。",
    swatch: ["#f2f6f2", "#2f6b4f", "#1a2e24"],
  },
  slate: {
    label: "冷灰",
    description: "冷灰底与钴蓝强调，清晰克制。",
    swatch: ["#f4f6fa", "#2563eb", "#111827"],
  },
  ink: {
    label: "夜读",
    description: "近单色与墨黑强调，偏编辑刊物感。",
    swatch: ["#fafafa", "#262626", "#0a0a0a"],
  },
  graphite: {
    label: "石墨",
    description: "中性灰搭配琥珀强调，信息层次清晰。",
    swatch: ["#f5f5f6", "#ea580c", "#18181b"],
  },
  ocean: {
    label: "海境",
    description: "青蓝与雾白，清爽通透的阅读感。",
    swatch: ["#f0f8fa", "#1d8a8a", "#12343b"],
  },
  rose: {
    label: "暮玫",
    description: "灰底与玫红强调，偏文艺与杂志感。",
    swatch: ["#faf5f6", "#b84a62", "#2a1418"],
  },
};

const ADMIN_PALETTE_COPY: Record<ThemePaletteId, PaletteCopy> = {
  editorial: {
    label: "墨纸",
    description: "与公开站一致的暖色编辑风格。",
    swatch: ["#f7f3eb", "#b54a3a", "#2a211c"],
  },
  forest: {
    label: "深林",
    description: "低饱和绿色，长时间使用更护眼。",
    swatch: ["#f2f6f3", "#3d8b6a", "#14241c"],
  },
  slate: {
    label: "冷灰",
    description: "偏 Linear 的冷灰界面，默认推荐。",
    swatch: ["#f4f6fa", "#3b82f6", "#0f172a"],
  },
  ink: {
    label: "夜读",
    description: "近单色界面，减少色彩干扰。",
    swatch: ["#fafafa", "#262626", "#0a0a0a"],
  },
  graphite: {
    label: "石墨",
    description: "中性灰搭配琥珀强调，信息层次清晰。",
    swatch: ["#f5f5f6", "#ea580c", "#18181b"],
  },
  ocean: {
    label: "海境",
    description: "青蓝工作台，清爽不刺眼。",
    swatch: ["#f0f8fa", "#1d8a8a", "#12343b"],
  },
  rose: {
    label: "暮玫",
    description: "灰底玫红强调，偏编辑与内容创作。",
    swatch: ["#faf5f6", "#b84a62", "#2a1418"],
  },
};

export const SITE_PALETTES: PaletteMeta<SitePaletteId>[] = THEME_PALETTE_IDS.map((id) => ({
  id,
  ...SITE_PALETTE_COPY[id],
}));

export const ADMIN_PALETTES: PaletteMeta<AdminPaletteId>[] = THEME_PALETTE_IDS.map((id) => ({
  id,
  ...ADMIN_PALETTE_COPY[id],
}));

export const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];

const SITE_PALETTE_IDS = new Set<string>(SITE_PALETTES.map((item) => item.id));
const ADMIN_PALETTE_IDS = new Set<string>(ADMIN_PALETTES.map((item) => item.id));

export function resolveColorMode(mode: ColorMode): ResolvedColorMode {
  if (mode === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function colorModeLabel(mode: ColorMode): string {
  return COLOR_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? "跟随系统";
}

function isColorMode(value: unknown): value is ColorMode {
  return value === "light" || value === "dark" || value === "system";
}

function parseLegacyMode(raw: string | null): ColorMode | null {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return null;
}

export function readThemeSettings<P extends string>(
  storageKey: string,
  legacyKey: string | null,
  defaultPalette: P,
  allowedPalettes: Set<string>,
): ThemeSettings<P> {
  if (typeof window === "undefined") {
    return { mode: "system", palette: defaultPalette };
  }

  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ThemeSettings<P>>;
      const mode = isColorMode(parsed.mode) ? parsed.mode : "system";
      const palette =
        typeof parsed.palette === "string" && allowedPalettes.has(parsed.palette)
          ? (parsed.palette as P)
          : defaultPalette;
      return { mode, palette };
    } catch {
      // fall through
    }
  }

  if (legacyKey) {
    const legacy = parseLegacyMode(localStorage.getItem(legacyKey));
    if (legacy) {
      return { mode: legacy, palette: defaultPalette };
    }
  }

  return { mode: "system", palette: defaultPalette };
}

export function writeThemeSettings<P extends string>(storageKey: string, settings: ThemeSettings<P>) {
  localStorage.setItem(storageKey, JSON.stringify(settings));
}

export function isSitePaletteId(value: string): value is SitePaletteId {
  return SITE_PALETTE_IDS.has(value);
}

export function isAdminPaletteId(value: string): value is AdminPaletteId {
  return ADMIN_PALETTE_IDS.has(value);
}

export function isThemePaletteId(value: string): value is ThemePaletteId {
  return SITE_PALETTE_IDS.has(value);
}
