import { FileTextIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileTextIcon className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-lg font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
