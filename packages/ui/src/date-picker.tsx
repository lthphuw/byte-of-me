'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button, type ButtonProps } from './button';
import { Calendar } from './calendar';
import { cn } from './lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type DatePickerProps = Omit<
  ButtonProps,
  'value' | 'onChange' | 'children' | 'asChild'
> & {
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  /**
   * The selected date already formatted in the caller's locale. Formatting
   * here would mean date-fns' English output on a `vi` screen, and this
   * package has no next-intl context to do better; the date-fns fallback
   * below only covers call sites that have not been migrated yet.
   */
  displayValue?: string;
  placeholder?: string;
};

export function DatePicker({
  value,
  onChange,
  displayValue,
  placeholder = 'Pick a date',
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
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (displayValue ?? format(value, 'PPP')) : placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
