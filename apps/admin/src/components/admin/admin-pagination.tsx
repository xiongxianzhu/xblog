import { Button, InputNumber, Pagination } from "antd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ContentWidthSelect } from "@/components/ui/content-width-select";
import { useAdminLocale } from "@/lib/locale";
import { useAdminMessages } from "@/lib/use-admin-messages";
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
  const txt = useAdminMessages();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 py-4">
      <Pagination
        className="admin-pagination min-w-0 max-w-full"
        responsive
        showLessItems
        current={page}
        pageSize={pageSize}
        total={total}
        disabled={disabled}
        showSizeChanger
        components={{
          sizeChanger: PageSizeSelect,
        }}
        showQuickJumper={false}
        pageSizeOptions={[...ADMIN_PAGE_SIZE_OPTIONS]}
        showTotal={(total) =>
          txt("m0342", {
            p0: total,
          })
        }
        onChange={(next, size) => {
          if (size !== pageSize) onPageSizeChange(size);
          else onPageChange(next);
        }}
        itemRender={(_page, type, original) =>
          type === "prev" ? (
            <ChevronLeft size={16} />
          ) : type === "next" ? (
            <ChevronRight size={16} />
          ) : (
            original
          )
        }
      />
      <PageJump
        key={`${page}-${pageSize}-${totalPages}`}
        page={page}
        totalPages={totalPages}
        disabled={disabled || totalPages <= 1}
        onPageChange={onPageChange}
      />
    </div>
  );
}
function PageSizeSelect(props: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  className: string;
}) {
  const txt = useAdminMessages();
  const { locale } = useAdminLocale();
  const suffix = locale === "en" ? "/ page" : locale === "zh-TW" ? txt("m0343") : txt("m0344");
  return (
    <ContentWidthSelect<number>
      {...props}
      showSearch={false}
      aria-label={locale === "en" ? "Page size" : locale === "zh-TW" ? txt("m0345") : txt("m0346")}
      options={ADMIN_PAGE_SIZE_OPTIONS.map((value) => ({
        value,
        label: `${value} ${suffix}`,
      }))}
    />
  );
}
function PageJump({
  page,
  totalPages,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  const txt = useAdminMessages();
  const [target, setTarget] = useState<number | null>(page);
  const valid = target !== null && Number.isSafeInteger(target) && target >= 1 && target <= totalPages;
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && valid && target !== page) onPageChange(target);
      }}
    >
      <span className="whitespace-nowrap text-sm">{txt("m0347")}</span>
      <InputNumber
        type="number"
        aria-label={txt("m0348")}
        inputMode="numeric"
        min={1}
        max={totalPages}
        step={1}
        value={target}
        onChange={setTarget}
        disabled={disabled}
        className="admin-page-jump-input w-20"
      />
      <span className="whitespace-nowrap text-sm">{txt("pageOf", { count: totalPages })}</span>
      <Button htmlType="submit" disabled={disabled || !valid || target === page}>
        {txt("m0350")}
      </Button>
    </form>
  );
}
