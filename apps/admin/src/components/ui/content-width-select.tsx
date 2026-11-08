import { Select, type SelectProps } from "antd";

/** Measure every label in the same grid cell so selection changes cannot resize the control. */
export function ContentWidthSelect<ValueType = string>({
  className,
  style,
  options,
  ...props
}: SelectProps<ValueType>) {
  const currentOptions = options?.map((option) => ({ ...option }));
  const layoutClassName = className
    ?.split(/\s+/)
    .filter((name) => /(^|:)(w-|min-w-|max-w-|shrink|grow|basis-|flex-|self-|m[trblxy]?-)/.test(name))
    .join(" ");
  return (
    <span
      className={`admin-content-width-select ${layoutClassName ?? ""}`}
      style={{ width: style?.width, minWidth: style?.minWidth, maxWidth: style?.maxWidth }}
    >
      <span aria-hidden className="admin-select-width-label">
        {props.placeholder}
      </span>
      {currentOptions?.map((option, index) => (
        <span aria-hidden className="admin-select-width-label" key={String(option.value ?? index)}>
          {option.label}
        </span>
      ))}
      <Select
        {...props}
        options={currentOptions}
        className={className}
        style={{ ...style, width: "100%", minWidth: 0 }}
      />
    </span>
  );
}
