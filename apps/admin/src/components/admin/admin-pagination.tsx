import { Pagination } from "antd";
import { ChevronLeft, ChevronRight } from "lucide-react";
export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const ADMIN_DEFAULT_PAGE_SIZE = 20;
type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
};
export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: Props) {
  return (
    <Pagination
      className="admin-pagination"
      responsive
      showLessItems
      current={page}
      pageSize={pageSize}
      total={total}
      disabled={disabled}
      showSizeChanger
      showQuickJumper
      pageSizeOptions={[...ADMIN_PAGE_SIZE_OPTIONS]}
      showTotal={(total) => `共 ${total} 条`}
      onChange={(next, size) => {
        if (size !== pageSize) onPageSizeChange(size);
        else onPageChange(next);
      }}
      itemRender={(_page, type, original) =>
        type === "prev" ? <ChevronLeft size={16} /> : type === "next" ? <ChevronRight size={16} /> : original
      }
    />
  );
}
