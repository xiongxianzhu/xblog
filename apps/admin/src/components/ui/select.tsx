import { Select as AntSelect } from "antd";
import { ChevronDown } from "lucide-react";
import { Children, type ComponentProps, isValidElement, type ReactNode } from "react";

type Part = {
  children?: ReactNode;
  value?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  container?: HTMLElement | null;
  align?: string;
  position?: string;
  side?: string;
  sideOffset?: number;
};
export function SelectItem(props: Part) {
  return <>{props.children}</>;
}
export function SelectContent(props: Part) {
  return <>{props.children}</>;
}
export function SelectTrigger(props: Part) {
  return <>{props.children}</>;
}
export function SelectValue(props: Part) {
  return <>{props.placeholder}</>;
}
export function Select({
  children,
  onValueChange,
  ...props
}: Omit<ComponentProps<typeof AntSelect<string>>, "children" | "onChange" | "options"> & {
  children: ReactNode;
  onValueChange?: (value: string) => void;
}) {
  const options: { value: string; label: ReactNode; disabled?: boolean }[] = [];
  let placeholder: ReactNode;
  let className = props.className;
  let id = props.id;
  function visit(nodes: ReactNode) {
    Children.forEach(nodes, (node) => {
      if (!isValidElement<Part>(node)) return;
      const p = node.props;
      if (p.value !== undefined) options.push({ value: p.value, label: p.children, disabled: p.disabled });
      else {
        if (node.type === SelectTrigger) {
          className = p.className ?? className;
          id = p.id ?? id;
        }
        if (node.type === SelectValue) placeholder = p.placeholder;
        visit(p.children);
      }
    });
  }
  visit(children);
  return (
    <AntSelect
      {...props}
      id={id}
      className={className}
      placeholder={placeholder}
      style={{ minWidth: 100, ...props.style }}
      options={options}
      onChange={onValueChange}
      suffixIcon={<ChevronDown size={14} />}
      getPopupContainer={() => document.body}
    />
  );
}
