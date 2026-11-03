import { Tag } from "antd";
import type { ComponentProps } from "react";
export function Badge({
  variant,
  ...props
}: Omit<ComponentProps<typeof Tag>, "variant"> & { variant?: string }) {
  return (
    <Tag
      {...props}
      color={variant === "destructive" ? "error" : variant === "default" ? "processing" : undefined}
    />
  );
}
