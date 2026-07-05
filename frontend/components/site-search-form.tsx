"use client";

import { FormEvent, useState } from "react";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

type SiteSearchFormProps = {
  compact?: boolean;
  initialQuery?: string;
};

export function SiteSearchForm({ compact, initialQuery = "" }: SiteSearchFormProps) {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="hidden min-w-0 sm:block">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="h-8 w-[9.5rem] rounded-sm border-border/70 bg-background/60 pl-7 text-xs backdrop-blur-sm lg:w-44"
            aria-label={t("keywordLabel")}
          />
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          className="sm:max-w-xl"
          aria-label={t("keywordLabel")}
        />
        <Button type="submit" className="sm:w-auto">
          <SearchIcon data-icon="inline-start" />
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
