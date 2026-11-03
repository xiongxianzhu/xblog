import { Input } from "antd";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AdminListSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function AdminListSearch({ value, onChange, placeholder = "搜索…", className }: AdminListSearchProps) {
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
