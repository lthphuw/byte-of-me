'use client';

import { LoaderCircle } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

/**
 * One photo in the strip.
 *
 * A plain `<img>`, not `next/image`: these bytes come from
 * `/api/health/photos/[id]`, an authenticated route the optimizer would fetch
 * with no session and cache in a shared store.
 *
 * The spinner is not decoration. Photos upload the moment they are picked, and
 * an invisible asymmetry is how someone loses a photo they thought they had
 * cancelled.
 *
 * **Removing lives in the caption panel, not on the tile.** The control here
 * was a 24px disc inset over the thumbnail's own 80px button — under the 44px
 * minimum and close enough to fuse with the tile it sat on, so a thumb aiming
 * to open a caption deleted the photo instead.
 */
export function PhotoThumb({
  src,
  alt,
  caption,
  pending,
  onSelect,
  isSelected,
}: {
  src: string;
  alt: string;
  caption: string | null;
  pending?: boolean;
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
      ) : null}
    </div>
  );
}
