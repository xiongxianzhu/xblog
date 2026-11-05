import { Table as AntTable } from "antd";
import { Children, type ComponentProps, isValidElement, type ReactNode } from "react";

type Part = ComponentProps<"td">;
export function TableHeader(props: ComponentProps<"thead">) {
  return <>{props.children}</>;
}
export function TableBody(props: ComponentProps<"tbody">) {
  return <>{props.children}</>;
}
export function TableRow(props: ComponentProps<"tr">) {
  return <>{props.children}</>;
}
export function TableHead(props: ComponentProps<"th">) {
  return <>{props.children}</>;
}
export function TableCell(props: Part) {
  return <>{props.children}</>;
}
function elements(nodes: ReactNode): React.ReactElement<Part>[] {
  return Children.toArray(nodes).filter(isValidElement) as React.ReactElement<Part>[];
}
export function Table({ children, className }: ComponentProps<"table">) {
  const parts = elements(children);
  const header = parts.find((p) => p.type === TableHeader);
  const body = parts.find((p) => p.type === TableBody);
  const heads = elements(elements(header?.props.children)[0]?.props.children);
  const rows = elements(body?.props.children).map((row, index) => ({
    key: String(row.key ?? index),
    cells: elements(row.props.children),
  }));
  return (
    <AntTable
      className={className}
      pagination={false}
      scroll={{ x: "max-content" }}
      dataSource={rows}
      columns={heads.map((cell, index) => ({
        key: String(index),
        title: cell.props.children,
        align: "center",
        ...(cell.props.className?.includes("text-right") ? { fixed: "right" as const } : {}),
        className: cell.props.className?.replace("text-right", "text-center"),
        render: (_value: unknown, row: (typeof rows)[number]) =>
          cell.props.className?.includes("text-right") ? (
            <div className="admin-table-actions-content">{row.cells[index]?.props.children}</div>
          ) : (
            row.cells[index]?.props.children
          ),
        onCell: (row: (typeof rows)[number]) => ({
          colSpan:
            index > 0 && (row.cells[0]?.props.colSpan ?? 1) > index
              ? 0
              : (row.cells[index]?.props.colSpan ?? 1),
          className:
            `${row.cells[index]?.props.className?.replace("text-right", "text-center") ?? ""} ${cell.props.className?.includes("text-right") ? "admin-table-actions" : ""}`.trim(),
          style: row.cells[index]?.props.style,
        }),
      }))}
    />
  );
}
