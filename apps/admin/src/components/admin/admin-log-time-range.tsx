import { DatePicker } from "antd";
import dayjs from "dayjs";
import { CalendarDays } from "lucide-react";

export function AdminLogTimeRange({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (field: "start_at" | "end_at", value: string) => void;
}) {
  return (
    <>
      {(["start_at", "end_at"] as const).map((field) => {
        const value = field === "start_at" ? start : end;
        const label = field === "start_at" ? "开始时间" : "结束时间";
        return (
          <DatePicker
            key={field}
            aria-label={label}
            placeholder={label}
            title={`${label}（北京时间）`}
            showTime
            needConfirm={false}
            format="YYYY-MM-DD HH:mm:ss"
            className="w-56 max-w-full"
            allowClear
            suffixIcon={<CalendarDays size={16} />}
            value={value ? dayjs(value.slice(0, 19)) : null}
            onChange={(date) =>
              onChange(
                field,
                date
                  ? `${(field === "end_at" ? date.endOf("second") : date.startOf("second")).format("YYYY-MM-DDTHH:mm:ss.SSS")}+08:00`
                  : "",
              )
            }
          />
        );
      })}
      <span className="text-xs text-muted-foreground">北京时间</span>
    </>
  );
}
