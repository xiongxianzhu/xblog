import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminText } from "@/lib/admin-messages";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

type AdminConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};
export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = adminText("m0308"),
  cancelLabel = adminText("m0217"),
  variant = "default",
  loading = false,
  onConfirm,
}: AdminConfirmDialogProps) {
  const txt = useAdminMessages();
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="max-w-md gap-5">
        <DialogHeader className="gap-3 sm:flex-row sm:items-start sm:text-left">
          <div
            className={cn(
              "mx-auto flex size-11 shrink-0 items-center justify-center rounded-full sm:mx-0",
              variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            <AlertTriangleIcon className="size-5" />
          </div>
          <div className="space-y-1.5 text-center sm:text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? (
              <>
                <Loader2Icon className="animate-spin" />
                {txt("m0309")}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
