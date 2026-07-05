"use client";

import { CheckCircle2Icon, InfoIcon, Loader2Icon, XCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AdminFeedbackVariant = "success" | "error" | "info" | "loading";

type AdminFeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: AdminFeedbackVariant;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
};

const variantStyles: Record<AdminFeedbackVariant, { icon: typeof CheckCircle2Icon; className: string }> = {
  success: { icon: CheckCircle2Icon, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  error: { icon: XCircleIcon, className: "bg-destructive/10 text-destructive" },
  info: { icon: InfoIcon, className: "bg-primary/10 text-primary" },
  loading: { icon: Loader2Icon, className: "bg-muted text-muted-foreground" },
};

export function AdminFeedbackDialog({
  open,
  onOpenChange,
  variant,
  title,
  message,
  confirmLabel = "知道了",
  onConfirm,
}: AdminFeedbackDialogProps) {
  const { icon: Icon, className } = variantStyles[variant];

  function handleClose() {
    onOpenChange(false);
    onConfirm?.();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => variant !== "loading" && onOpenChange(next)}>
      <DialogContent className="max-w-md gap-5">
        <DialogHeader className="gap-3 sm:flex-row sm:items-start sm:text-left">
          <div className={cn("mx-auto flex size-11 shrink-0 items-center justify-center rounded-full sm:mx-0", className)}>
            <Icon className={cn("size-5", variant === "loading" && "animate-spin")} />
          </div>
          <div className="space-y-1.5 text-center sm:text-left">
            <DialogTitle>{title}</DialogTitle>
            {message ? <DialogDescription>{message}</DialogDescription> : null}
          </div>
        </DialogHeader>
        {variant !== "loading" ? (
          <DialogFooter>
            <Button className="w-full sm:w-auto" onClick={handleClose}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
