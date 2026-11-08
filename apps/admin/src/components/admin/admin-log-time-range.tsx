import { DatePicker } from "antd";
import dayjs from "dayjs";
import { CalendarDays } from "lucide-react";
import { useAdminMessages } from "@/lib/use-admin-messages";
export function AdminLogTimeRange({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (field: "start_at" | "end_at", value: string) => void;
}) {
  const txt = useAdminMessages();
  return (
    <>
      {(["start_at", "end_at"] as const).map((field) => {
        const value = field === "start_at" ? start : end;
        const label = field === "start_at" ? txt("m0335") : txt("m0336");
        return (
          <DatePicker
            key={field}
            aria-label={label}
            placeholder={label}
            title={txt("m0337", {
              p0: label,
            })}
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
      <span className="text-xs text-muted-foreground">{txt("m0338")}</span>
    </>
  );
}
