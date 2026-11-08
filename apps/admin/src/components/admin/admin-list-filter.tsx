import { ContentWidthSelect as Select } from "@/components/ui/content-width-select";
import { adminText } from "@/lib/admin-messages";
import { useAdminMessages } from "@/lib/use-admin-messages";
export const BOOLEAN_FILTER_OPTIONS = [
  {
    value: "true",
    get label() {
      return adminText("m0311");
    },
  },
  {
    value: "false",
    get label() {
      return adminText("m0312");
    },
  },
];
export const ACTIVE_FILTER_OPTIONS = [
  {
    value: "true",
    get label() {
      return adminText("m0313");
    },
  },
  {
    value: "false",
    get label() {
      return adminText("m0314");
    },
  },
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
  options: {
    value: string;
    label: string;
  }[];
}) {
  const txt = useAdminMessages();
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={onChange}
      className="min-w-36 max-w-full shrink-0"
      options={[
        {
          value: "",
          label: txt("m0315", {
            p0: label,
          }),
        },
        ...options,
      ]}
    />
  );
}
