"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { zhCN } from "date-fns/locale";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function CalendarChevron({
  orientation = "left",
  className,
}: {
  orientation?: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const iconClass = cn("size-4 shrink-0", className);

  if (orientation === "left") return <ChevronLeftIcon className={iconClass} />;
  if (orientation === "right") return <ChevronRightIcon className={iconClass} />;
  if (orientation === "up") return <ChevronUpIcon className={iconClass} />;
  return <ChevronDownIcon className={iconClass} />;
}

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={zhCN}
      showOutsideDays={showOutsideDays}
      className={cn("rdp-admin-calendar p-3", className)}
      classNames={{
        months: cn("rdp-months", "flex flex-col gap-4 sm:flex-row"),
        month: cn("rdp-month", "relative flex w-full flex-col items-center gap-3"),
        month_caption: cn("rdp-month_caption", "flex h-9 w-full items-center justify-center px-1"),
        caption_label: cn("rdp-caption_label", "text-sm font-medium"),
        nav: cn("rdp-nav", "flex items-center gap-1"),
        button_previous: cn(
          "rdp-button_previous",
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          "rdp-button_next",
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        month_grid: cn("rdp-month_grid", "w-fit"),
        weekdays: cn("rdp-weekdays", "grid w-full grid-cols-7 gap-x-2 justify-items-center"),
        weekday: cn(
          "rdp-weekday",
          "flex h-8 w-8 items-center justify-center text-[0.8rem] font-normal text-muted-foreground",
        ),
        week: cn("rdp-week", "mt-1.5 grid w-full grid-cols-7 gap-x-2 justify-items-center"),
        day: cn(
          "rdp-day",
          "flex h-8 w-8 items-center justify-center p-0 text-center text-sm focus-within:relative focus-within:z-20",
        ),
        day_button: cn(
          "rdp-day_button",
          buttonVariants({ variant: "ghost" }),
          "size-7 rounded-full p-0 font-normal transition-colors",
        ),
        selected: cn("rdp-selected"),
        today: cn("rdp-today"),
        outside: cn(
          "rdp-outside",
          "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        ),
        disabled: cn("rdp-disabled", "text-muted-foreground opacity-50"),
        hidden: cn("rdp-hidden", "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
