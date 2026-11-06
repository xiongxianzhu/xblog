"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

export function PublicPageJump({
  page,
  totalPages,
  basePath,
  label,
  buttonLabel,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  label: string;
  buttonLabel: string;
}) {
  const router = useRouter();
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const target = Number(new FormData(event.currentTarget).get("page"));
        if (Number.isSafeInteger(target) && target >= 1 && target <= totalPages && target !== page) {
          router.push(target === 1 ? basePath : `${basePath}?page=${target}`);
        }
      }}
    >
      <Input
        key={`${page}-${totalPages}`}
        name="page"
        type="number"
        inputMode="numeric"
        required
        min={1}
        max={totalPages}
        step={1}
        defaultValue={page}
        aria-label={label}
        className="h-9 w-20"
      />
      <Button type="submit" variant="outline" size="sm">
        {buttonLabel}
      </Button>
    </form>
  );
}
