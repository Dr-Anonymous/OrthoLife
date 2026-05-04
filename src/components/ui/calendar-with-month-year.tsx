import * as React from "react";
import type { DayPickerSingleProps } from 'react-day-picker';
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CalendarWithMonthYearPickerProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  fromYear?: number;
  toYear?: number;
  className?: string;
  disabled?: (date: Date) => boolean;
  onClose?: () => void;
  components?: DayPickerSingleProps['components'];
  onMonthChange?: (date: Date) => void;
}

export function CalendarWithMonthYearPicker({
  selected,
  onSelect,
  fromYear = 1930,
  toYear = new Date().getFullYear() + 10,
  className,
  disabled,
  onClose,
  components,
  onMonthChange,
}: CalendarWithMonthYearPickerProps) {
  const [month, setMonth] = useState<Date>(selected || new Date());

  useEffect(() => {
    if (selected) {
      setMonth(selected);
    }
  }, [selected?.getTime()]);

  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  );

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthChange = (newMonth: string) => {
    const date = new Date(month);
    date.setMonth(parseInt(newMonth));
    setMonth(date);
  };

  const handleYearChange = (newYear: string) => {
    const date = new Date(month);
    date.setFullYear(parseInt(newYear));
    setMonth(date);
  };

  return (
    <div className={cn("p-0", className)}>
      <div className="p-3 border-b space-y-2">
        <div className="flex gap-2">
          <Select
            value={month.getMonth().toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="flex-1 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={month.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="flex-1 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={(date) => {
          onSelect(date);
          if (date && onClose) onClose();
        }}
        month={month}
        onMonthChange={(newMonth) => {
          setMonth(newMonth);
          if (onMonthChange) onMonthChange(newMonth);
        }}
        disabled={disabled}
        initialFocus
        className="p-3"
        {...(components ? { components } : {})}
      />
    </div>
  );
}
