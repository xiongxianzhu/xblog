"use client";

import { Languages } from "lucide-react";
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
        aria-label={`${t("label")}: ${localeLabels[locale]}`}
        title={t("label")}
        className={cn(
          "site-locale-trigger w-auto shrink-0 justify-center gap-2 rounded-sm border-0 bg-transparent font-medium [&>svg]:hidden",
          compact ? "h-10 min-w-16 px-2 text-sm" : "h-10 min-w-16 px-3 text-sm",
          className,
        )}
      >
        <SelectValue>
          <span className="inline-flex items-center gap-2">
            <Languages className="size-[18px]" aria-hidden="true" />
            <span>{locale === "en" ? "EN" : locale === "zh-TW" ? "繁" : "中"}</span>
          </span>
        </SelectValue>
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
