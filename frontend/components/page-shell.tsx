import { cn } from "@/lib/utils";

type PageShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
};

export function PageShell({ title, description, children, className, narrow }: PageShellProps) {
  return (
    <div className={cn("page-enter mx-auto px-4 py-12 sm:px-6", narrow ? "max-w-3xl" : "max-w-5xl", className)}>
      <header className="mb-10 flex flex-col gap-3 border-b border-border/70 pb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">xblog</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {description ? <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
