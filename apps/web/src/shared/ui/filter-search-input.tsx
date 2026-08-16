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
 *
 * The input had the same problem: it was labelled by `placeholder` alone, which
 * is not an accessible name (it disappears once typing starts, and assistive
 * tech is not obliged to fall back to it). Rather than thread a second string
 * through both call sites, `placeholder` doubles as `aria-label` — it is already
 * a translated, descriptive phrase ("Search project...", "Tìm kiếm bài viết..."),
 * so the two would have been the same words anyway.
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

      {/* No `text-sm`: the shared Input is `text-base md:text-sm`, and forcing
          14px at every width makes iOS Safari zoom the page in on focus now that
          the viewport meta no longer pins `maximum-scale=1`. Letting the default
          through keeps 16px where that matters and 14px from md up.
          `h-11 md:h-9` for the same split reason — 36px is under the 44px touch
          minimum, but the dashboard density the default serves stays untouched.
          `appearance-none` on the cancel button hides WebKit's built-in clear
          affordance, which `type="search"` would otherwise stack on top of ours.
          `pr-11` keeps the text clear of the enlarged clear button below. */}
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
