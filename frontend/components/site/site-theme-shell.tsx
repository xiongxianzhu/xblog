import { cn } from "@/lib/utils";
import type { SitePublicTheme } from "@/lib/themes";

type SiteThemeShellProps = {
  theme: SitePublicTheme;
  children: React.ReactNode;
  className?: string;
};

export function SiteThemeShell({ theme, children, className }: SiteThemeShellProps) {
  return (
    <div
      data-site-shell
      data-site-palette={theme.palette}
      className={cn(
        "flex min-h-[100dvh] min-w-0 flex-1 flex-col overflow-x-clip bg-background text-foreground",
        theme.mode === "dark" && "dark",
        className,
      )}
    >
      {children}
    </div>
  );
}
