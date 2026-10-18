'use client';

import * as React from 'react';
import {
  Badge,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@byte-of-me/ui-primitives';
import { cn } from '@byte-of-me/ui-utils';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';

export interface MultiSelectOption {
  label: string;
  value: string;
}

type MultiSelectProps = Omit<
  React.ComponentPropsWithoutRef<'button'>,
  'value' | 'onChange' | 'children'
> & {
  options: MultiSelectOption[];
  selected: string[];
  onValueChange: (value: string[]) => void;
  /** Shown while nothing is selected. */
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  /** Accessible name of a chip's remove button, from the chip's label. */
  removeLabel: (label: string) => string;
};

export function MultiSelect({
  options,
  selected,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  removeLabel,
  className,
  // `id` and the aria-* attributes arrive from <FormControl>'s Slot.
  ...triggerProps
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (value: string) =>
    onValueChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );

  // The chips sit beside the trigger, not inside it: a button in a button is
  // invalid HTML and the inner one has no place in the tab order.
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            'flex min-h-8 w-full items-start rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring',
            className
          )}
        >
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 py-1.5 pl-2">
              {selected.map((value) => {
                const label =
                  options.find((option) => option.value === value)?.label ??
                  value;
                return (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="font-normal"
                  >
                    {label}
                    <button
                      type="button"
                      aria-label={removeLabel(label)}
                      disabled={triggerProps.disabled}
                      onClick={() => toggle(value)}
                      className="-my-1 -mr-1.5 ml-1 flex size-6 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
          <PopoverTrigger asChild>
            <button
              type="button"
              {...triggerProps}
              role="combobox"
              aria-expanded={open}
              className="flex min-h-[inherit] flex-1 items-center justify-between gap-2 self-stretch px-3 text-left text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selected.length === 0 && (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => toggle(option.value)}
                >
                  <Check
                    className={cn(
                      selected.includes(option.value)
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
