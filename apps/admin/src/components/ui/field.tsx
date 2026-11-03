import { Typography } from "antd";
import type { ComponentProps } from "react";
export function Field({ orientation, ...props }: ComponentProps<"div"> & { orientation?: string }) {
  return (
    <div
      {...props}
      className={`${orientation === "horizontal" ? "flex items-center gap-3" : "space-y-2"} ${props.className || ""}`}
    />
  );
}
export function FieldGroup(props: ComponentProps<"div">) {
  return <div {...props} className={`space-y-5 ${props.className || ""}`} />;
}
export function FieldLabel(props: ComponentProps<"label">) {
  return (
    <label
      {...props}
      htmlFor={props.htmlFor}
      className={`block font-medium text-sm ${props.className || ""}`}
    >
      {props.children}
    </label>
  );
}
export function FieldDescription(props: ComponentProps<"p">) {
  return <p {...props} className={`text-sm text-muted-foreground ${props.className || ""}`} />;
}
export function FieldError({
  children,
  errors,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
  errors?: ({ message?: string } | undefined)[];
}) {
  return (
    <Typography.Text type="danger" className={className}>
      {children ?? errors?.map((e) => e?.message).join("；")}
    </Typography.Text>
  );
}
export const FieldLegend = FieldLabel;
export const FieldSet = FieldGroup;
