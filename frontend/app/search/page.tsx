"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { searchPosts } from "@/lib/api";
import type { PostSummary } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const posts = await searchPosts(query.trim());
      setResults(posts);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-enter mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-10 flex flex-col gap-3 border-b border-border/70 pb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Search</p>
        <h1 className="font-serif text-4xl font-semibold">搜索文章</h1>
        <p className="text-muted-foreground">按标题、摘要或正文关键词查找。</p>
      </header>

      <form onSubmit={handleSearch} className="mb-10">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="q">关键词</FieldLabel>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入关键词…"
                className="sm:max-w-xl"
              />
              <Button type="submit" disabled={loading} className="sm:w-auto">
                <SearchIcon data-icon="inline-start" />
                {loading ? "搜索中…" : "搜索"}
              </Button>
            </div>
          </Field>
        </FieldGroup>
      </form>

      {searched && results.length === 0 ? (
        <EmptyState title="未找到相关文章" description="换个关键词试试。" />
      ) : null}
      <div className="flex flex-col gap-5">
        {results.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
