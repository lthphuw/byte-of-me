'use client';

import { Input } from '@byte-of-me/ui';
import { Search, X } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface FilterSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible name for the clear button. */
  clearLabel: string;
  className?: string;
}

/**
 * Search field with a clear button, shared by the blog and project filters.
 * `placeholder` doubles as `aria-label`: it vanishes once typing starts, and it is
 * already a translated, descriptive phrase.
 */
export function FilterSearchInput({
  value,
  onChange,
  placeholder,
  clearLabel,
  className,
}: FilterSearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />

      {/* No `text-sm`: 14px at every width makes iOS Safari zoom in on focus (16px does not). */}
      <Input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 pl-9 pr-11 md:h-9 md:pr-9 [&::-webkit-search-cancel-button]:appearance-none"
      />

      {value && (
        // The glyph stays 14px, but the hit area fills the 44px field height on
        // touch and collapses back to the original 22px box from md up, where the
        // pointer is precise and the field is only 36px tall anyway.
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:right-2 md:h-auto md:w-auto md:p-1"
        >
          <X className="size-3.5" />
          <span className="sr-only">{clearLabel}</span>
        </button>
      )}
    </div>
  );
}
