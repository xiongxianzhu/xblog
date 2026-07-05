"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { searchPosts } from "@/lib/api";
import type { PostSummary } from "@/lib/types";

function SearchPageInner() {
  const t = useTranslations("search");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const posts = await searchPosts(trimmed);
      setResults(posts);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(urlQuery);
    if (urlQuery.trim()) {
      void runSearch(urlQuery);
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [urlQuery, runSearch]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <div className="page-enter mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-10 flex flex-col gap-3 border-b border-border/70 pb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>

      <form onSubmit={handleSubmit} className="mb-10">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="q">{t("keywordLabel")}</FieldLabel>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("placeholder")}
                className="sm:max-w-xl"
              />
              <Button type="submit" disabled={loading} className="sm:w-auto">
                <SearchIcon data-icon="inline-start" />
                {loading ? t("submitting") : t("submit")}
              </Button>
            </div>
          </Field>
        </FieldGroup>
      </form>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {!loading && searched && results.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : null}

      {!loading ? (
        <div className="flex flex-col gap-5">
          {results.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <Skeleton className="mb-8 h-24 w-full" />
          <Skeleton className="h-12 w-full max-w-xl" />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
