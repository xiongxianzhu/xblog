import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-6", className)} {...props} />;
}

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label className={cn("text-sm font-medium", className)} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-destructive", className)} {...props} />;
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel };
