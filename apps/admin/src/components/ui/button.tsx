import { Button as AntButton } from "antd";
import { type ComponentProps, isValidElement, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { adminPath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"button">, "color"> & {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
};
export function Button({ variant = "default", size, type = "button", asChild, children, ...props }: Props) {
  const navigate = useNavigate();
  const buttonType =
    variant === "default"
      ? "primary"
      : variant === "ghost"
        ? "text"
        : variant === "link"
          ? "link"
          : "default";
  const buttonSize = size === "sm" ? "small" : size === "lg" ? "large" : "middle";
  if (asChild && isValidElement(children)) {
    const child = (children as ReactElement<ComponentProps<"a">>).props;
    return (
      <AntButton
        href={props.disabled ? undefined : child.href}
        target={child.target}
        rel={child.rel}
        title={child.title ?? props.title}
        aria-label={child["aria-label"] ?? props["aria-label"]}
        className={cn(props.className, child.className)}
        disabled={props.disabled}
        danger={variant === "destructive"}
        type={buttonType}
        size={buttonSize}
        onClick={(event) => {
          if (props.disabled) {
            event.preventDefault();
            return;
          }
          child.onClick?.(event as React.MouseEvent<HTMLAnchorElement>);
          if (
            !event.defaultPrevented &&
            child.href?.match(/^\/admin(?:\/|$)/) &&
            (!child.target || child.target === "_self") &&
            event.button === 0 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey
          ) {
            event.preventDefault();
            navigate(adminPath(child.href));
          }
        }}
      >
        {child.children}
      </AntButton>
    );
  }
  return (
    <AntButton
      {...props}
      htmlType={type}
      danger={variant === "destructive"}
      type={buttonType}
      size={buttonSize}
    >
      {children}
    </AntButton>
  );
}
