
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
      className={`p-4 bg-white rounded-[1.5rem] border border-gray-100 shadow-xl shadow-primary/5 ${className}`}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-lg font-black text-primary tracking-tight font-ruqaa",
        
        nav: "space-x-1 flex items-center absolute inset-x-0 justify-between px-1",
        nav_button: "h-8 w-8 bg-white border border-gray-100 p-0 hover:bg-primary hover:text-white rounded-xl transition-all flex items-center justify-center shadow-sm text-gray-500",
        nav_button_previous: "",
        nav_button_next: "",
        
        table: "w-full border-collapse", // Standard table layout to prevent vertical stacking
        head_row: "", // Let it be a table row
        head_cell: "text-gray-400 w-10 font-bold text-[0.8rem] pb-2 uppercase tracking-wider",
        
        row: "w-full mt-2", // Let it be a table row
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/5 first:[&:has([aria-selected])]:rounded-r-xl last:[&:has([aria-selected])]:rounded-l-xl focus-within:relative focus-within:z-20",
        
        day: "h-10 w-10 p-0 font-bold text-sm aria-selected:opacity-100 rounded-xl hover:bg-gray-100 hover:text-primary transition-all flex items-center justify-center mx-auto",
        day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white shadow-lg shadow-primary/30",
        day_today: "bg-gray-50 text-primary border-2 border-primary/20",
        day_outside: "text-gray-300 opacity-50",
        day_disabled: "text-gray-300 opacity-50 cursor-not-allowed bg-gray-50/50",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronRight className="h-5 w-5" />, // Swapped for RTL (Previous points Right)
        IconRight: ({ ...props }) => <ChevronLeft className="h-5 w-5" />, // Swapped for RTL (Next points Left)
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
export { Calendar };
