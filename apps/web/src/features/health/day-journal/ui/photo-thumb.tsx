'use client';

import { LoaderCircle, X } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

/**
 * One photo in the strip.
 *
 * A plain `<img>`, not `next/image`. These bytes come from
 * `/api/health/photos/[id]`, an authenticated route — the optimizer would
 * fetch them server-side with no session and cache the result in a shared
 * store, which is both broken and the wrong place for a private photograph.
 *
 * The spinner is not decoration. Photos upload the moment they are picked,
 * not when Save is pressed — a `File` cannot survive a drawer close, and five
 * of them will not fit in one server action request. That asymmetry is
 * invisible unless the pending state is drawn, and an invisible asymmetry is
 * how someone loses a photo they thought they had cancelled.
 */
export function PhotoThumb({
  src,
  alt,
  caption,
  pending,
  removeLabel,
  onRemove,
  onSelect,
  isSelected,
}: {
  src: string;
  alt: string;
  caption: string | null;
  pending?: boolean;
  removeLabel: string;
  onRemove?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={onSelect}
        aria-pressed={pending ? undefined : isSelected}
        aria-label={caption ? `${alt} — ${caption}` : alt}
        className={cn(
          'block size-20 overflow-hidden rounded-2xl border bg-muted',
          'transition-[border-color,transform] duration-200 ease-out motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          !pending && 'active:scale-95 motion-reduce:active:scale-100',
          isSelected ? 'border-foreground' : 'border-border'
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- see the note above */}
        <img
          src={src}
          alt=""
          className={cn(
            'size-full object-cover transition-opacity duration-200',
            pending && 'opacity-40'
          )}
        />
      </button>

      {pending ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <LoaderCircle
            aria-hidden
            className="size-5 animate-spin text-foreground motion-reduce:animate-none"
          />
        </span>
      ) : onRemove ? (
        // Its own button, outside the thumbnail's button — a button inside a
        // button is invalid HTML and the inner one does not receive clicks.
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className={cn(
            'absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full',
            'border bg-card text-muted-foreground shadow-sm',
            'transition-colors duration-200 hover:text-foreground motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
          )}
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
