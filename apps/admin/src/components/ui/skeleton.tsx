import { Skeleton as AntSkeleton } from "antd";
export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden className={`admin-skeleton block ${className ?? ""}`}>
      <AntSkeleton.Input active block style={{ height: "100%", minHeight: 16 }} />
    </span>
  );
}
