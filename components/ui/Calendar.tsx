
import React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={`p-4 bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-between items-center relative h-10 mb-2 px-1",
        caption_label: "text-sm font-bold text-gray-900 mx-auto tracking-tight",
        nav: "flex items-center gap-1",
        nav_button: "h-8 w-8 bg-transparent border-none flex items-center justify-center text-gray-400 hover:text-primary transition-all z-10 hover:bg-gray-50 rounded-lg",
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex justify-between mb-4",
        head_cell: "text-gray-400 w-8 font-bold text-[10px] uppercase text-center tracking-wider",
        row: "flex w-full mt-1 justify-between",
        cell: "h-8 w-8 text-center text-[11px] p-0 relative focus-within:relative focus-within:z-20",
        day: "h-8 w-8 p-0 font-bold rounded-lg transition-all hover:bg-primary/5 flex items-center justify-center text-gray-700",
        day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary font-bold shadow-md !rounded-lg",
        day_today: "text-primary font-black border-b-2 border-primary rounded-none",
        day_outside: "text-gray-300 opacity-50 pointer-events-none",
        day_disabled: "text-gray-200 opacity-30 cursor-not-allowed",
        day_hidden: "invisible",
        caption_dropdowns: "flex gap-2 items-center mx-auto",
        dropdown: "bg-transparent border-none text-[11px] font-bold text-gray-900 focus:ring-0 cursor-pointer p-1 hover:bg-gray-50 rounded transition-colors",
        vhidden: "hidden",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
