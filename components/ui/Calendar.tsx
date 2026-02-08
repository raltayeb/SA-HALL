
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
      className={`p-4 ${className}`}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-6 w-full",
        caption: "flex justify-center pt-2 relative items-center w-full mb-4",
        caption_label: "text-lg font-black text-gray-900 z-10",
        nav: "flex items-center absolute inset-x-0 justify-between px-1",
        nav_button: "h-9 w-9 bg-gray-50 border border-gray-100 p-0 hover:bg-primary hover:text-white hover:border-primary rounded-xl transition-all flex items-center justify-center text-gray-500 z-20",
        nav_button_previous: "", // Position handled by flex justify-between in nav
        nav_button_next: "",     // Position handled by flex justify-between in nav
        table: "w-full border-collapse",
        head_row: "flex justify-between mb-2",
        head_cell: "text-gray-400 rounded-md w-12 font-bold text-xs uppercase tracking-wider",
        row: "flex w-full mt-2 justify-between",
        cell: "h-12 w-12 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: "h-12 w-12 p-0 font-bold text-base aria-selected:opacity-100 hover:bg-gray-50 rounded-2xl transition-all text-gray-900",
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white shadow-lg shadow-primary/30 rounded-2xl",
        day_today: "bg-gray-50 text-primary font-black border border-primary/20",
        day_outside: "text-gray-300 opacity-50",
        day_disabled: "text-red-200 bg-red-50/50 cursor-not-allowed line-through opacity-100 decoration-red-200 decoration-2",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronRight className="h-5 w-5" />, // RTL Previous (Right Arrow)
        IconRight: ({ ...props }) => <ChevronLeft className="h-5 w-5" />, // RTL Next (Left Arrow)
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
export { Calendar };
