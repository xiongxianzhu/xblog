import { App, ConfigProvider, type ThemeConfig, theme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import "dayjs/locale/zh-tw";
import { useLayoutEffect, useState } from "react";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { FeedbackBridge } from "@/lib/feedback";
import { useAdminLocale } from "@/lib/locale";
import { hslChannelsToHex } from "@/lib/theme-color";

export function AntProvider({ children }: { children: React.ReactNode }) {
  const { palette, resolvedMode } = useAdminTheme();
  const { locale } = useAdminLocale();
  const [surfaceTokens, setSurfaceTokens] = useState<NonNullable<ThemeConfig["token"]>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: Palette and mode change the computed CSS values on the application shell.
  useLayoutEffect(() => {
    const shell = document.querySelector("#root [data-admin-shell]");
    if (!shell) return;
    const styles = getComputedStyle(shell);
    const color = (name: string) => hslChannelsToHex(styles.getPropertyValue(name));
    setSurfaceTokens({
      colorPrimary: color("--primary"),
      colorPrimaryHover: color("--ring"),
      colorPrimaryActive: color("--primary"),
      colorPrimaryBg: color("--accent"),
      colorPrimaryBorder: color("--border"),
      colorPrimaryTextHover: color("--ring"),
      colorPrimaryTextActive: color("--primary"),
      colorTextLightSolid: color("--primary-foreground"),
      colorInfo: color("--primary"),
      colorInfoBg: color("--accent"),
      colorError: color("--destructive"),
      colorErrorText: color("--destructive"),
      colorSuccess: styles.getPropertyValue("--design-success").trim(),
      colorWarning: styles.getPropertyValue("--design-warning").trim(),
      controlItemBgActive: color("--accent"),
      controlItemBgHover: color("--muted"),
      colorBgLayout: color("--background"),
      colorBgContainer: color("--card"),
      colorBgElevated: color("--popover"),
      colorText: color("--foreground"),
      colorPrimaryText: color("--primary"),
      colorInfoText: color("--primary"),
      colorLink: color("--primary"),
      colorTextSecondary: color("--muted-foreground"),
      colorTextPlaceholder: color("--muted-foreground"),
      colorBorder: color("--input"),
      colorBorderSecondary: color("--border"),
    });
  }, [palette, resolvedMode]);
  dayjs.locale(locale === "zh-CN" ? "zh-cn" : locale === "zh-TW" ? "zh-tw" : "en");
  return (
    <ConfigProvider
      locale={locale === "en" ? enUS : locale === "zh-TW" ? zhTW : zhCN}
      theme={{
        algorithm: (seed, map) => ({
          ...(resolvedMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm)(seed, map),
          ...surfaceTokens,
        }),
        token: {
          ...surfaceTokens,
          borderRadius: 2,
          borderRadiusLG: 4,
          controlHeight: 44,
          controlHeightSM: 44,
          controlHeightLG: 44,
          fontFamily: '"Noto Sans SC", system-ui, sans-serif',
        },
        components: {
          Button: {
            defaultShadow: "none",
            primaryShadow: "none",
            primaryColor: surfaceTokens.colorTextLightSolid,
          },
          Menu: {
            itemHeight: 46,
            itemMarginInline: 8,
            itemBorderRadius: 2,
            itemSelectedColor:
              palette === "slate"
                ? resolvedMode === "dark"
                  ? "#A8CAFF"
                  : "#244F91"
                : `color-mix(in srgb, ${surfaceTokens.colorPrimary} 70%, ${surfaceTokens.colorText})`,
            itemSelectedBg: `color-mix(in srgb, ${surfaceTokens.colorPrimary} 12%, ${surfaceTokens.colorBgContainer})`,
            itemHoverBg: `color-mix(in srgb, ${surfaceTokens.colorPrimary} 6%, ${surfaceTokens.colorBgContainer})`,
          },
          Input: { activeBorderColor: surfaceTokens.colorPrimaryHover, activeShadow: "none" },
          Card: { borderRadiusLG: 4 },
          Table: { cellPaddingBlock: 12, cellPaddingInline: 16 },
        },
      }}
    >
      <App>
        <FeedbackBridge />
        {children}
      </App>
    </ConfigProvider>
  );
}
