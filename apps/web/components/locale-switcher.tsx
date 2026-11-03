"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type AppLocale, localeLabels, locales } from "@/i18n/routing";
import { setSiteLocale } from "@/lib/locale-actions";
import { siteSelectItemClass } from "@/lib/site-shell-portal";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = { className?: string; compact?: boolean };
export function LocaleSwitcher({ className, compact }: LocaleSwitcherProps) {
  const t = useTranslations("locale");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  function handleLocaleChange(next: AppLocale) {
    if (next === locale) return;
    startTransition(async () => {
      await setSiteLocale(next);
      router.replace(pathname, { locale: next });
    });
  }
  return (
    <Select value={locale} disabled={pending} onValueChange={(next) => handleLocaleChange(next as AppLocale)}>
      <SelectTrigger
        aria-label={t("label")}
        className={cn(
          "site-locale-trigger rounded-sm border-border/70 bg-background/60 backdrop-blur-sm",
          compact ? "h-8 w-auto min-w-[7.5rem] shrink-0 px-2.5 text-xs" : "h-9 w-auto min-w-[8rem] text-sm",
          className,
        )}
      >
        <SelectValue>{localeLabels[locale]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((item) => (
          <SelectItem key={item} value={item} className={siteSelectItemClass}>
            {localeLabels[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
