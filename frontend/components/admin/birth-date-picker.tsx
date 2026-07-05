"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
  adminPopoverPanelClass,
} from "@/components/admin/ai-assistant-form-styles";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

type PanelPickerProps = {
  label: string;
  valueLabel: string;
  panelEl: HTMLElement | null;
  children: React.ReactNode;
};

function PanelPicker({ label, valueLabel, panelEl, children }: PanelPickerProps) {
  const triggerClass = cn(
    adminBorderlessControlClass,
    adminBorderlessFocusClass,
    "admin-form-control h-10 w-full justify-between px-3 font-normal hover:bg-muted/40",
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" aria-label={label} className={triggerClass}>
          <span className="truncate">{valueLabel}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        container={panelEl}
        align="start"
        className={cn(adminPopoverPanelClass, "z-[60] max-h-56 overflow-y-auto p-1")}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BirthDatePicker({ id, value, onChange, className, disabled }: BirthDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);
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

  function handleYearChange(nextYear: number) {
    setViewYear(nextYear);
  }

  function handleMonthChange(nextMonth: number) {
    setViewMonth(nextMonth);
  }

  function handleDaySelect(date: Date | undefined) {
    if (!date) return;
    onChange(formatIsoDate(date));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <div className={cn("flex gap-2", className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="ghost"
            disabled={disabled}
            className={cn(
              "admin-form-control h-10 flex-1 justify-start px-3 font-normal hover:bg-muted/40",
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
      <PopoverContent className="z-50 w-auto border-0 bg-transparent p-0 shadow-none" align="start">
        <div
          ref={setPanelEl}
          data-admin-shell
          data-admin-palette={palette}
          className={cn(
            "w-[min(100vw-2rem,20rem)] overflow-visible rounded-[2px] border border-primary/25 bg-popover text-popover-foreground shadow-md",
            resolvedMode === "dark" && "dark",
          )}
        >
          <div className="flex flex-col gap-3 p-3">
            <div className="grid grid-cols-2 gap-2">
              <PanelPicker label="选择年份" valueLabel={`${viewYear} 年`} panelEl={panelEl}>
                {yearOptions.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    className="rounded-[2px]"
                    onSelect={() => handleYearChange(year)}
                  >
                    {year} 年
                    {year === viewYear ? <CheckIcon className="ml-auto size-4 text-primary" /> : null}
                  </DropdownMenuItem>
                ))}
              </PanelPicker>
              <PanelPicker
                label="选择月份"
                valueLabel={MONTH_OPTIONS[viewMonth - 1]?.label ?? `${viewMonth}月`}
                panelEl={panelEl}
              >
                {monthOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className="rounded-[2px]"
                    onSelect={() => handleMonthChange(Number(option.value))}
                  >
                    {option.label}
                    {Number(option.value) === viewMonth ? (
                      <CheckIcon className="ml-auto size-4 text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </PanelPicker>
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
