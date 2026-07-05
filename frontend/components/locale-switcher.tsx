"use client";

import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { locales, localeLabels, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { setAppLocale } from "@/lib/locale-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export function LocaleSwitcher({ className, compact }: LocaleSwitcherProps) {
  const t = useTranslations("locale");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const nextPathname = useNextPathname();
  const nextRouter = useNextRouter();
  const [pending, startTransition] = useTransition();
  const unprefixedRoute = nextPathname.startsWith("/admin");

  function handleLocaleChange(next: AppLocale) {
    if (next === locale) return;

    if (unprefixedRoute) {
      startTransition(() => {
        void setAppLocale(next).then(() => {
          nextRouter.refresh();
        });
      });
      return;
    }

    router.replace(pathname, { locale: next });
  }

  return (
    <Select value={locale} disabled={pending} onValueChange={(next) => handleLocaleChange(next as AppLocale)}>
      <SelectTrigger
        aria-label={t("label")}
        className={cn(
          compact
            ? "h-8 w-auto min-w-[7.5rem] shrink-0 border-border/70 px-2.5 text-xs"
            : "h-9 w-auto min-w-[8rem] border-border/70 text-sm",
          className,
        )}
      >
        <SelectValue>{localeLabels[locale]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((item) => (
          <SelectItem key={item} value={item}>
            {localeLabels[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
