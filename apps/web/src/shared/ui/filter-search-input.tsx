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
 * Search field with a clear button, shared by the blog and project filters —
 * the two had byte-identical copies of this markup, and neither gave the clear
 * button an accessible name.
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

      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 pr-9 text-sm"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" />
          <span className="sr-only">{clearLabel}</span>
        </button>
      )}
    </div>
  );
}
