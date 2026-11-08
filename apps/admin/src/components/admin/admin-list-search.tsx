import { Input } from "antd";
import { SearchIcon } from "lucide-react";
import { adminText } from "@/lib/admin-messages";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

type AdminListSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};
export function AdminListSearch({
  value,
  onChange,
  placeholder = adminText("m0316"),
  className,
}: AdminListSearchProps) {
  useAdminMessages();
  return (
    <div className={cn("w-full max-w-sm", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        prefix={<SearchIcon aria-hidden className="mr-1 size-4 text-muted-foreground" />}
        allowClear
        aria-label={placeholder}
      />
    </div>
  );
}
