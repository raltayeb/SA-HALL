
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { arSA } from 'date-fns/locale'

import { Button } from "./Button"
import { Calendar } from "./Calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./Popover"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabledDays?: (date: Date) => boolean;
}

export function DatePicker({ date, setDate, label, placeholder = "اختر التاريخ", disabledDays }: DatePickerProps) {
  return (
    <div className="grid gap-2 w-full">
      {label && <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">{label}</label>}
      <Popover align="start">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full h-14 justify-between text-right font-bold rounded-2xl border-gray-100 bg-gray-50 px-6 hover:bg-gray-100 transition-all ${!date && "text-gray-400"}`}
          >
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span>
                {date ? format(date, "PPP", { locale: arSA }) : placeholder}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-300" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={disabledDays}
            initialFocus
            locale={arSA}
            dir="rtl"
            className="rounded-[2rem] border border-gray-100"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
