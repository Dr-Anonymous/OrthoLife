import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SchedulePopoverProps {
  scheduledDate?: Date;
  scheduledTime: string;
  onDateChange: (date?: Date) => void;
  onTimeChange: (time: string) => void;
  className?: string;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export function SchedulePopover({
  scheduledDate,
  scheduledTime,
  onDateChange,
  onTimeChange,
  className,
  disabled,
  trigger
}: SchedulePopoverProps) {
  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      className={cn(
        'transition-colors',
        scheduledDate ? 'border-primary text-primary bg-primary/5' : 'text-gray-500',
        className
      )}
      title={scheduledDate ? `Scheduled for ${format(scheduledDate, 'MMM d, yyyy')} at ${scheduledTime}` : 'Schedule message'}
    >
      <Clock className="w-4 h-4" />
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={scheduledDate}
          onSelect={onDateChange}
          initialFocus
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        />
        {scheduledDate && (
          <div className="p-3 border-t space-y-2">
            <Label htmlFor="schedule-time" className="text-xs text-gray-600">Schedule Time</Label>
            <input
              id="schedule-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onDateChange(undefined)}
            >
              Clear Schedule
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
