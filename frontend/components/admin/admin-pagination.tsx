"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const ADMIN_DEFAULT_PAGE_SIZE = 20;

type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
};

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  function jumpToPage() {
    const parsed = Number.parseInt(pageInput.trim(), 10);
    if (!Number.isFinite(parsed)) return;
    onPageChange(Math.min(totalPages, Math.max(1, parsed)));
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        共 {total} 条，显示 {rangeStart}–{rangeEnd}
      </p>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">每页</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 w-[5.5rem]" aria-label="每页条数">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">条</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-9 px-0"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="上一页"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-[4.5rem] text-center text-sm tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-9 px-0"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="下一页"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                jumpToPage();
              }
            }}
            className="h-9 w-16 px-2 text-center tabular-nums"
            aria-label="页码"
            disabled={disabled}
          />
          <Button type="button" variant="outline" size="sm" className="h-9" disabled={disabled} onClick={jumpToPage}>
            跳转
          </Button>
        </div>
      </div>
    </div>
  );
}
