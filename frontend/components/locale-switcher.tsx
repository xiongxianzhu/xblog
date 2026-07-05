"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import {
  AdminDropdownMenuContent,
  AdminShellPanel,
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { locales, localeLabels, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { setAppLocale } from "@/lib/locale-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type AdminLocaleSwitcherProps = {
  className?: string;
  compact?: boolean;
  locale: AppLocale;
  pending: boolean;
  label: string;
  onChange: (next: AppLocale) => void;
};

function AdminLocaleSwitcher({ className, compact, locale, pending, label, onChange }: AdminLocaleSwitcherProps) {
  const { palette, resolvedMode } = useAdminTheme();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          aria-label={label}
          className={cn(
            adminBorderlessControlClass,
            adminBorderlessFocusClass,
            "h-auto justify-between gap-1.5 font-normal hover:bg-muted/40",
            compact
              ? "h-8 min-w-[7.5rem] shrink-0 px-2.5 text-xs"
              : "h-9 min-w-[8rem] text-sm",
            className,
          )}
        >
          <span className="truncate">{localeLabels[locale]}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <AdminDropdownMenuContent align="end">
        <AdminShellPanel palette={palette} resolvedMode={resolvedMode} className="min-w-[7.5rem] p-1.5">
          {locales.map((item) => (
            <DropdownMenuItem
              key={item}
              className="rounded-[2px] py-2"
              onSelect={() => onChange(item)}
            >
              {localeLabels[item]}
              {item === locale ? <CheckIcon className="ml-auto size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
        </AdminShellPanel>
      </AdminDropdownMenuContent>
    </DropdownMenu>
  );
}

export function LocaleSwitcher({ className, compact }: LocaleSwitcherProps) {
  const t = useTranslations("locale");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const nextPathname = useNextPathname();
  const nextRouter = useNextRouter();
  const [pending, startTransition] = useTransition();
  const isAdmin = nextPathname.startsWith("/admin");

  function handleLocaleChange(next: AppLocale) {
    if (next === locale) return;

    if (isAdmin) {
      startTransition(() => {
        void setAppLocale(next).then(() => {
          nextRouter.refresh();
        });
      });
      return;
    }

    router.replace(pathname, { locale: next });
  }

  if (isAdmin) {
    return (
      <AdminLocaleSwitcher
        className={className}
        compact={compact}
        locale={locale}
        pending={pending}
        label={t("label")}
        onChange={handleLocaleChange}
      />
    );
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
