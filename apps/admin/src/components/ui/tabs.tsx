import { Tabs as AntTabs } from "antd";
import { Children, isValidElement, type ReactNode, useState } from "react";

type Part = { children?: ReactNode; value?: string; className?: string; disabled?: boolean };
export function TabsList(props: Part) {
  return <>{props.children}</>;
}
export function TabsTrigger(props: Part) {
  return <>{props.children}</>;
}
export function TabsContent(props: Part) {
  return <>{props.children}</>;
}
export function Tabs({
  children,
  value,
  defaultValue,
  onValueChange,
  className,
}: Part & { defaultValue?: string; onValueChange?: (value: string) => void }) {
  const [active, setActive] = useState(defaultValue);
  const labels = new Map<string, ReactNode>();
  const contents = new Map<string, ReactNode>();
  function visit(nodes: ReactNode) {
    Children.forEach(nodes, (node) => {
      if (!isValidElement<Part>(node)) return;
      if (node.type === TabsTrigger && node.props.value) labels.set(node.props.value, node.props.children);
      else if (node.type === TabsContent && node.props.value)
        contents.set(node.props.value, <div className={node.props.className}>{node.props.children}</div>);
      else visit(node.props.children);
    });
  }
  visit(children);
  return (
    <AntTabs
      className={className}
      activeKey={value ?? active}
      onChange={(key) => {
        setActive(key);
        onValueChange?.(key);
      }}
      items={[...labels].map(([key, label]) => ({ key, label, children: contents.get(key) }))}
    />
  );
}
