
import React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { arSA } from "date-fns/locale";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={arSA}
      dir="rtl"
      showOutsideDays={showOutsideDays}
      className={`p-3 ${className}`}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center w-full h-10",
        caption_label: "text-sm font-black text-gray-800",
        nav: "flex items-center",
        nav_button: "h-8 w-8 bg-white border border-gray-100 p-0 hover:bg-gray-50 rounded-xl transition-all absolute top-1/2 -translate-y-1/2 flex items-center justify-center shadow-sm text-gray-600",
        nav_button_previous: "left-1",
        nav_button_next: "right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-400 rounded-md w-9 font-bold text-[0.6rem] uppercase tracking-wider",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-r-md last:[&:has([aria-selected])]:rounded-l-md focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-bold aria-selected:opacity-100 hover:bg-gray-100 rounded-xl transition-all text-gray-700",
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white shadow-md shadow-primary/30",
        day_today: "bg-gray-100 text-gray-900 border border-gray-200",
        day_outside: "day-outside text-gray-300 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronRight className="h-4 w-4" />, 
        IconRight: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
export { Calendar };
