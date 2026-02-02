
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
      className={`p-4 bg-[#0a0a0a] rounded-[1.5rem] shadow-2xl text-white border border-white/5 ${className}`}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-between items-center relative h-10 mb-2 px-1",
        caption_label: "text-sm font-bold text-white mx-auto tracking-tight",
        nav: "flex items-center",
        nav_button: "h-8 w-8 bg-transparent border-none flex items-center justify-center text-white/60 hover:text-white transition-all z-10 hover:bg-white/5 rounded-lg",
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex justify-between mb-4",
        head_cell: "text-white/40 w-8 font-medium text-[10px] uppercase text-center tracking-wider",
        row: "flex w-full mt-1 justify-between",
        cell: "h-8 w-8 text-center text-[11px] p-0 relative focus-within:relative focus-within:z-20",
        day: "h-8 w-8 p-0 font-medium rounded-lg transition-all hover:bg-white/10 flex items-center justify-center text-white/90",
        day_selected: "bg-white/20 text-white hover:bg-white/30 focus:bg-white/20 font-bold border border-white/10 !rounded-lg",
        day_today: "text-primary font-bold border-b-2 border-primary rounded-none",
        day_outside: "text-white/5 opacity-30 pointer-events-none",
        day_disabled: "text-white/5 opacity-10 cursor-not-allowed",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
