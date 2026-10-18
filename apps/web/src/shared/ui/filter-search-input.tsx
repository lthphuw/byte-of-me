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
        className="pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
      />

      {value && (
        // The glyph stays 14px in a 24px box; `touch-target` is the 44px strip.
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors touch-target hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" />
          <span className="sr-only">{clearLabel}</span>
        </button>
      )}
    </div>
  );
}
