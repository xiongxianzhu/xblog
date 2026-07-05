"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { cn, formatIsoDate, parseIsoDate } from "@/lib/utils";

const MIN_YEAR = 1940;

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: format(new Date(2000, index, 1), "M月", { locale: zhCN }),
}));

type BirthDatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

function getTodayParts() {
  const now = new Date();
  return {
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export function BirthDatePicker({ id, value, onChange, className, disabled }: BirthDatePickerProps) {
  const [open, setOpen] = useState(false);
  const { resolvedMode, palette } = useAdminTheme();
  const selected = useMemo(() => (value ? parseIsoDate(value) : undefined), [value]);
  const today = useMemo(() => getTodayParts(), []);

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? 1990);
  const [viewMonth, setViewMonth] = useState((selected?.getMonth() ?? 0) + 1);

  useEffect(() => {
    if (!open) return;
    setViewYear(selected?.getFullYear() ?? 1990);
    setViewMonth((selected?.getMonth() ?? 0) + 1);
  }, [open, selected]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = today.year; year >= MIN_YEAR; year -= 1) {
      years.push(year);
    }
    return years;
  }, [today.year]);

  const monthOptions = useMemo(() => {
    const maxMonth = viewYear === today.year ? today.month : 12;
    return MONTH_OPTIONS.filter((option) => Number(option.value) <= maxMonth);
  }, [today.month, today.year, viewYear]);

  useEffect(() => {
    if (viewYear === today.year && viewMonth > today.month) {
      setViewMonth(today.month);
    }
  }, [today.month, today.year, viewMonth, viewYear]);

  const calendarMonth = useMemo(() => new Date(viewYear, viewMonth - 1, 1), [viewMonth, viewYear]);

  function handleYearChange(nextYear: string) {
    setViewYear(Number(nextYear));
  }

  function handleMonthChange(nextMonth: string) {
    setViewMonth(Number(nextMonth));
  }

  function handleDaySelect(date: Date | undefined) {
    if (!date) return;
    onChange(formatIsoDate(date));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("flex gap-2", className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 flex-1 justify-start rounded-[2px] px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-70" />
            {selected ? format(selected, "yyyy年M月d日", { locale: zhCN }) : "选择出生日期"}
          </Button>
        </PopoverTrigger>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-10 shrink-0 rounded-[2px] px-0 text-muted-foreground"
            aria-label="清除出生日期"
            disabled={disabled}
            onClick={() => onChange("")}
          >
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </div>
      <PopoverContent className="w-auto border-0 bg-transparent p-0 shadow-none" align="start">
        <div
          data-admin-shell
          data-admin-palette={palette}
          className={cn(
            "w-[min(100vw-2rem,20rem)] overflow-hidden rounded-[2px] border border-border bg-popover text-popover-foreground shadow-md",
            resolvedMode === "dark" && "dark",
          )}
        >
          <div className="flex flex-col gap-3 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={String(viewYear)} onValueChange={handleYearChange}>
              <SelectTrigger className="rounded-[2px]" aria-label="选择年份">
                <SelectValue placeholder="年份" />
              </SelectTrigger>
              <SelectContent className="max-h-56 rounded-[2px]">
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(viewMonth)} onValueChange={handleMonthChange}>
              <SelectTrigger className="rounded-[2px]" aria-label="选择月份">
                <SelectValue placeholder="月份" />
              </SelectTrigger>
              <SelectContent className="rounded-[2px]">
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            className="p-0"
            month={calendarMonth}
            onMonthChange={(month) => {
              setViewYear(month.getFullYear());
              setViewMonth(month.getMonth() + 1);
            }}
            selected={selected}
            startMonth={new Date(MIN_YEAR, 0, 1)}
            endMonth={today.date}
            disabled={{ after: today.date }}
            hideNavigation
            classNames={{ month_caption: "rdp-month_caption hidden" }}
            onSelect={handleDaySelect}
          />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
