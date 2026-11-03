import { Divider } from "antd";
export function Separator({
  className,
  orientation,
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <Divider
      className={className}
      type={orientation}
      style={{ minWidth: 0, width: orientation === "vertical" ? undefined : "auto" }}
    />
  );
}
