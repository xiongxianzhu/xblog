import { ContentWidthSelect as Select } from "@/components/ui/content-width-select";

export const BOOLEAN_FILTER_OPTIONS = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
];

export const ACTIVE_FILTER_OPTIONS = [
  { value: "true", label: "启用" },
  { value: "false", label: "禁用" },
];

export function AdminListFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={onChange}
      className="min-w-36 max-w-full shrink-0"
      options={[{ value: "", label: `全部${label}` }, ...options]}
    />
  );
}
