'use client';

import { cn } from '@byte-of-me/ui-utils';
import { CalendarIcon } from 'lucide-react';

import { Button, type ButtonProps } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type DatePickerProps = Omit<
  ButtonProps,
  'value' | 'onChange' | 'children' | 'asChild'
> & {
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  /** Shown while no date is picked. */
  placeholder: string;
  /** The picked date in the caller's locale; this package has no i18n context. */
  formatDate: (date: Date) => string;
  /** react-day-picker locale for the month and weekday names. */
  calendarLocale?: React.ComponentProps<typeof Calendar>['locale'];
};

export function DatePicker({
  value,
  onChange,
  placeholder,
  formatDate,
  calendarLocale,
  className,
  // `id` and the aria-* attributes arrive from <FormControl>'s Slot; dropping
  // them left <FormLabel htmlFor> pointing at nothing and the error unlinked.
  ...triggerProps
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          {...triggerProps}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={onChange}
          locale={calendarLocale}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
