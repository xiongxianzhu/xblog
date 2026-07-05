import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ProfileSectionProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ProfileSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  contentClassName,
}: ProfileSectionProps) {
  return (
    <section
      className={cn(
        "admin-profile-section group relative overflow-hidden rounded-[2px] border border-border/70 bg-card/60 backdrop-blur-sm",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent"
      />
      <header className="flex gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[2px] border border-border/60 bg-muted/40 text-muted-foreground transition-colors group-hover:text-foreground">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-base font-medium tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
      </header>
      <div className={cn("px-5 py-5", contentClassName)}>{children}</div>
    </section>
  );
}
