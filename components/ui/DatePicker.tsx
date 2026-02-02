
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabledDays?: (date: Date) => boolean;
}

export function DatePicker({ date, setDate, label, placeholder = "اختر التاريخ" }: DatePickerProps) {
  // Native date input uses YYYY-MM-DD string format
  const dateValue = date ? format(date, "yyyy-MM-dd") : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setDate(new Date(val));
    } else {
      setDate(undefined);
    }
  };

  return (
    <div className="grid gap-2 w-full group">
      {label && (
        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-right px-1">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
          <CalendarIcon className="h-5 w-5" />
        </div>
        <input
          type="date"
          value={dateValue}
          onChange={handleChange}
          className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-6 pr-14 text-right font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all appearance-none cursor-pointer"
          style={{ 
            colorScheme: 'light',
            // Specific styling for the native picker icon to hide it or move it if needed
          }}
        />
        {!date && (
          <span className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-sm">
            {placeholder}
          </span>
        )}
      </div>
      <style>{`
        /* Minimal styling for native date picker */
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
      `}</style>
    </div>
  )
}
