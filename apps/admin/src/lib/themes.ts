import { adminText } from "@/lib/admin-messages";
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
  nav_order?: string[];
  posts_per_page: number;
  site_base_url: string;
  github_link_enabled: boolean;
  github_link_url: string;
  article_share_enabled: boolean;
  copyright_enabled: boolean;
  copyright_content: string;
};
export const DEFAULT_SITE_THEME: SitePublicTheme = {
  mode: "light",
  palette: "editorial",
  site_name: "xblog",
  site_tagline: "Ink & Paper",
  site_logo_url: null,
  site_icp_number: null,
  posts_per_page: 10,
  site_base_url: "",
  github_link_enabled: false,
  github_link_url: "",
  article_share_enabled: false,
  copyright_enabled: false,
  copyright_content:
    "除非特别说明，任何媒体、网站或个人转载本博客的原创内容，请严格遵循 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hans) 的知识共享协议。",
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
    get label() {
      return adminText("m0768");
    },
    get description() {
      return adminText("m0769");
    },
    swatch: ["#f7f3eb", "#b54a3a", "#2a211c"],
  },
  forest: {
    get label() {
      return adminText("m0770");
    },
    get description() {
      return adminText("m0771");
    },
    swatch: ["#f2f6f2", "#2f6b4f", "#1a2e24"],
  },
  slate: {
    get label() {
      return adminText("m0772");
    },
    get description() {
      return adminText("m0773");
    },
    swatch: ["#f4f6fa", "#2563eb", "#111827"],
  },
  ink: {
    get label() {
      return adminText("m0774");
    },
    get description() {
      return adminText("m0775");
    },
    swatch: ["#fafafa", "#262626", "#0a0a0a"],
  },
  graphite: {
    get label() {
      return adminText("m0776");
    },
    get description() {
      return adminText("m0777");
    },
    swatch: ["#f5f5f6", "#ea580c", "#18181b"],
  },
  ocean: {
    get label() {
      return adminText("m0778");
    },
    get description() {
      return adminText("m0779");
    },
    swatch: ["#f0f8fa", "#1d8a8a", "#12343b"],
  },
  rose: {
    get label() {
      return adminText("m0780");
    },
    get description() {
      return adminText("m0781");
    },
    swatch: ["#faf5f6", "#b84a62", "#2a1418"],
  },
};
const ADMIN_PALETTE_COPY: Record<ThemePaletteId, PaletteCopy> = {
  editorial: {
    get label() {
      return adminText("m0768");
    },
    get description() {
      return adminText("m0782");
    },
    swatch: ["#f7f3eb", "#b54a3a", "#2a211c"],
  },
  forest: {
    get label() {
      return adminText("m0770");
    },
    get description() {
      return adminText("m0783");
    },
    swatch: ["#f2f6f3", "#3d8b6a", "#14241c"],
  },
  slate: {
    get label() {
      return adminText("m0784");
    },
    get description() {
      return adminText("m0785");
    },
    swatch: ["#f5f7fb", "#285da8", "#1b2b41"],
  },
  ink: {
    get label() {
      return adminText("m0774");
    },
    get description() {
      return adminText("m0786");
    },
    swatch: ["#fafafa", "#262626", "#0a0a0a"],
  },
  graphite: {
    get label() {
      return adminText("m0776");
    },
    get description() {
      return adminText("m0777");
    },
    swatch: ["#f5f5f6", "#ea580c", "#18181b"],
  },
  ocean: {
    get label() {
      return adminText("m0778");
    },
    get description() {
      return adminText("m0787");
    },
    swatch: ["#f0f8fa", "#1d8a8a", "#12343b"],
  },
  rose: {
    get label() {
      return adminText("m0780");
    },
    get description() {
      return adminText("m0788");
    },
    swatch: ["#faf5f6", "#b84a62", "#2a1418"],
  },
};
export const SITE_PALETTES: PaletteMeta<SitePaletteId>[] = THEME_PALETTE_IDS.map((id) => ({
  id,
  get label() {
    return SITE_PALETTE_COPY[id].label;
  },
  get description() {
    return SITE_PALETTE_COPY[id].description;
  },
  swatch: SITE_PALETTE_COPY[id].swatch,
}));
export const ADMIN_PALETTES: PaletteMeta<AdminPaletteId>[] = THEME_PALETTE_IDS.map((id) => ({
  id,
  get label() {
    return ADMIN_PALETTE_COPY[id].label;
  },
  get description() {
    return ADMIN_PALETTE_COPY[id].description;
  },
  swatch: ADMIN_PALETTE_COPY[id].swatch,
}));
export const COLOR_MODE_OPTIONS: {
  value: ColorMode;
  label: string;
}[] = [
  {
    value: "light",
    get label() {
      return adminText("m0352");
    },
  },
  {
    value: "dark",
    get label() {
      return adminText("m0353");
    },
  },
  {
    value: "system",
    get label() {
      return adminText("m0354");
    },
  },
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
  return COLOR_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? adminText("m0354");
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
    return {
      mode: "system",
      palette: defaultPalette,
    };
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
      return {
        mode,
        palette,
      };
    } catch {
      // fall through
    }
  }
  if (legacyKey) {
    const legacy = parseLegacyMode(localStorage.getItem(legacyKey));
    if (legacy) {
      return {
        mode: legacy,
        palette: defaultPalette,
      };
    }
  }
  return {
    mode: "system",
    palette: defaultPalette,
  };
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
