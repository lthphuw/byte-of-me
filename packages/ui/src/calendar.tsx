'use client';

import * as React from 'react';
import {
  type DayButton,
  DayPicker,
  getDefaultClassNames,
} from 'react-day-picker';
import { cn } from '@byte-of-me/ui-utils';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button, buttonVariants } from './button';

// 44px cells on touch, 32px with a pointer. Seven of them plus `p-3` is 332px,
// which fits a 375px phone.
const CELL = '[--cell-size:2.75rem] can-hover:[--cell-size:2rem]';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('bg-background p-3', CELL, className)}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'relative flex flex-col gap-4 md:flex-row',
          defaultClassNames.months
        ),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-[--cell-size] w-[--cell-size] select-none p-0',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-[--cell-size] w-[--cell-size] select-none p-0',
          defaultClassNames.button_next
        ),
        month_caption: cn(
          'flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]',
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          'select-none text-sm font-medium',
          defaultClassNames.caption_label
        ),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 select-none rounded-md text-[0.8rem] font-normal text-muted-foreground',
          defaultClassNames.weekday
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        day: cn(
          'relative aspect-square h-full w-full select-none p-0 text-center',
          defaultClassNames.day
        ),
        today: cn(
          'rounded-md bg-accent text-accent-foreground',
          defaultClassNames.today
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside
        ),
        disabled: cn(
          'text-muted-foreground opacity-50',
          defaultClassNames.disabled
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation }) => {
          const Icon =
            orientation === 'left' ? ChevronLeftIcon : ChevronRightIcon;
          return <Icon className={cn('size-4', className)} />;
        },
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-selected={modifiers.selected}
      className={cn(
        'flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-normal leading-none data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground [&>span]:text-xs [&>span]:opacity-70',
        className
      )}
      {...props}
    />
  );
}

export { Calendar };
