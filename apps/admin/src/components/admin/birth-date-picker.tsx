import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Calendar, X } from "lucide-react";
export function BirthDatePicker({
  value = "",
  onChange,
  ...props
}: {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <DatePicker
      {...props}
      value={value ? dayjs(value) : null}
      onChange={(date) => onChange?.(date?.format("YYYY-MM-DD") ?? "")}
      maxDate={dayjs()}
      minDate={dayjs("1940-01-01")}
      suffixIcon={<Calendar size={16} />}
      allowClear={{ clearIcon: <X size={14} /> }}
    />
  );
}
