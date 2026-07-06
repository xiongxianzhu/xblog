import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type PublicPaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
  prevLabel: string;
  nextLabel: string;
  pageLabel: string;
};

function pageHref(basePath: string, targetPage: number): string {
  return targetPage <= 1 ? basePath : `${basePath}?page=${targetPage}`;
}

export function PublicPagination({
  page,
  totalPages,
  basePath,
  prevLabel,
  nextLabel,
  pageLabel,
}: PublicPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const prevPage = page - 1;
  const nextPage = page + 1;

  return (
    <nav
      className="flex flex-col items-center gap-3 border-t border-border/60 pt-8 sm:flex-row sm:justify-between"
      aria-label={pageLabel}
    >
      <p className="text-sm text-muted-foreground">{pageLabel}</p>

      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <Button type="button" variant="outline" size="sm" className="gap-1" disabled>
            <ChevronLeftIcon className="size-4" />
            {prevLabel}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={pageHref(basePath, prevPage)}>
              <ChevronLeftIcon className="size-4" />
              {prevLabel}
            </Link>
          </Button>
        )}

        {page >= totalPages ? (
          <Button type="button" variant="outline" size="sm" className="gap-1" disabled>
            {nextLabel}
            <ChevronRightIcon className="size-4" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={pageHref(basePath, nextPage)}>
              {nextLabel}
              <ChevronRightIcon className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
