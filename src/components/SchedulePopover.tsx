import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Clock, Calendar as CalendarIcon, X, Check, ArrowRight } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';

import { getNextHour } from '@/utils/dateUtils';

interface SchedulePopoverProps {
  scheduledDate?: Date;
  scheduledTime?: string;
  onDateChange: (date?: Date) => void;
  onTimeChange: (time: string) => void;
  onConfirm?: (date: Date, time: string) => void;
  className?: string;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export function SchedulePopover({
  scheduledDate: propDate,
  scheduledTime: propTime,
  onDateChange,
  onTimeChange,
  onConfirm,
  className,
  disabled,
  trigger
}: SchedulePopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localDate, setLocalDate] = React.useState<Date | undefined>(propDate);
  const [localTime, setLocalTime] = React.useState<string>(propTime || getNextHour());

  // Sync with props when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalDate(propDate);
      setLocalTime(propTime || getNextHour());
    }
  }, [isOpen, propDate, propTime]);

  const handleDateSelect = (date?: Date) => {
    setLocalDate(date);
    if (!onConfirm) {
      onDateChange(date);
    }
  };

  const handleTimeChange = (time: string) => {
    setLocalTime(time);
    if (!onConfirm) {
      onTimeChange(time);
    }
  };

  const handleDone = () => {
    if (onConfirm && localDate) {
      onConfirm(localDate, localTime);
    }
    setIsOpen(false);
  };

  const getScheduleSummary = () => {
    const date = onConfirm ? localDate : propDate;
    const time = onConfirm ? localTime : (propTime || getNextHour());

    if (!date) return null;
    let day = format(date, 'MMM d');
    if (isToday(date)) day = 'Today';
    else if (isTomorrow(date)) day = 'Tomorrow';
    return `${day} at ${time}`;
  };

  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      className={cn(
        'transition-all duration-300 rounded-xl relative overflow-hidden',
        propDate
          ? 'border-primary bg-primary/5 text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)] ring-1 ring-primary/20'
          : 'text-gray-500 border-gray-200 hover:border-primary/50 hover:bg-gray-50',
        className
      )}
      title={propDate ? `Scheduled for ${getScheduleSummary()}` : 'Schedule message'}
    >
      <Clock className={cn("w-4 h-4 transition-transform", propDate && "scale-110")} />
      {propDate && (
        <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full translate-x-[-2px] translate-y-[2px]"></span>
      )}
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 rounded-2xl shadow-2xl border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200" align="end">
        <div className="bg-gray-50/50 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Schedule Delivery
            </h4>
            {(onConfirm ? localDate : propDate) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                onClick={() => handleDateSelect(undefined)}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-0">
          <Calendar
            mode="single"
            selected={onConfirm ? localDate : propDate}
            onSelect={handleDateSelect}
            initialFocus
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className="p-3"
          />
        </div>

        {(onConfirm ? localDate : propDate) && (
          <div className="p-4 border-t border-gray-100 bg-white space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="schedule-time" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Select Time
                </Label>
                <div className="relative group">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition-colors" />
                  <input
                    id="schedule-time"
                    type="time"
                    value={onConfirm ? localTime : (propTime || getNextHour())}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    onClick={(e) => (e.target as any).showPicker?.()}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-primary uppercase tracking-tight">Scheduled For</p>
                <p className="text-xs font-semibold text-gray-700 truncate">
                  {getScheduleSummary()}
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-lg h-8 px-3 shadow-md"
                onClick={handleDone}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {!(onConfirm ? localDate : propDate) && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium italic flex items-center gap-1.5">
              Select a date to continue <ArrowRight className="w-3 h-3" />
            </span>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-8" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
