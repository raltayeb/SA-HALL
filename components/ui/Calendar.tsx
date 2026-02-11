
import React from "react";
import { DayPicker, DayProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { arSA, enUS } from "date-fns/locale";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  renderDayContent?: (day: Date) => React.ReactNode;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  dir = 'rtl', 
  locale,
  renderDayContent,
  ...props
}: CalendarProps) {
  
  const activeLocale = locale || (dir === 'ltr' ? enUS : arSA);

  return (
    <DayPicker
      locale={activeLocale}
      dir={dir}
      showOutsideDays={showOutsideDays}
      className={`p-0 ${className}`}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-between pt-2 relative items-center w-full mb-6 px-2",
        caption_label: "text-lg font-black text-gray-900 z-10",
        nav: "flex items-center gap-2",
        nav_button: "h-9 w-9 bg-white border border-gray-200 p-0 hover:border-primary hover:text-primary rounded-xl transition-all flex items-center justify-center text-gray-400",
        nav_button_previous: "", 
        nav_button_next: "",     
        table: "w-full border-collapse",
        head_row: "flex mb-2",
        head_cell: "text-gray-400 rounded-xl w-full font-bold text-[10px] uppercase tracking-wider h-9 flex items-center justify-center",
        row: "flex w-full mt-1 gap-1",
        cell: "h-14 w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20", // Increased height for price
        day: "h-14 w-full p-0 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all text-gray-700 flex flex-col items-center justify-center border border-transparent",
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-white hover:bg-primary hover:text-white border-primary",
        day_today: "bg-gray-50 text-primary font-black border-primary/20",
        day_outside: "text-gray-300 opacity-50",
        day_disabled: "text-gray-200 bg-transparent cursor-not-allowed decoration-slice line-through opacity-30 hover:bg-transparent hover:text-gray-200 hover:border-transparent",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => dir === 'ltr' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />, 
        IconRight: ({ ...props }) => dir === 'ltr' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />, 
        DayContent: (dayProps) => (
            <div className="flex flex-col items-center justify-center h-full w-full">
                <span>{dayProps.date.getDate()}</span>
                {renderDayContent && renderDayContent(dayProps.date)}
            </div>
        )
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
export { Calendar };
