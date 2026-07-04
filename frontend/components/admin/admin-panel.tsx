import { cn } from "@/lib/utils";

type AdminPanelProps = React.HTMLAttributes<HTMLDivElement>;

export function AdminPanel({ className, ...props }: AdminPanelProps) {
  return <div className={cn("admin-panel", className)} {...props} />;
}
