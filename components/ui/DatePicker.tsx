
import * as React from "react"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"
import { Calendar } from "./Calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./Popover"
import { Matcher } from "react-day-picker"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  disabledDates?: Matcher | Matcher[];
  className?: string;
}

export function DatePicker({ date, setDate, placeholder = "Select date", disabledDates, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (d: Date | undefined) => {
    setDate(d);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={`relative max-w-sm w-full ${className}`}>
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z"/>
            </svg>
          </div>
          <input 
            id="datepicker-actions" 
            readOnly
            type="text" 
            className="block w-full ps-10 pe-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 shadow-sm placeholder:text-gray-400 cursor-pointer outline-none transition-colors hover:bg-gray-100" 
            placeholder={placeholder}
            value={date ? format(date, 'yyyy-MM-dd', { locale: arSA }) : ''}
            onClick={() => setIsOpen(true)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[200]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={disabledDates}
          initialFocus
          locale={arSA}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  )
}
