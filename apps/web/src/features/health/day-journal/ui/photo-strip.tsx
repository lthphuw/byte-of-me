'use client';

import { AutoGrowingTextarea } from '@byte-of-me/ui';
import { ImagePlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { PhotoThumb } from './photo-thumb';

import {
  ACCEPTED_PHOTO_MIME_TYPES,
  MAX_PHOTOS_PER_DAY,
} from '@/entities/day-entry';
import type { DayPhotoRow } from '@/entities/day-entry';
import { cn } from '@/shared/lib/utils';

/** A photo picked but not yet stored. `previewUrl` is a `blob:` URL the
 *  caller created and is responsible for revoking. */
export interface PendingPhoto {
  tempId: string;
  previewUrl: string;
}

/**
 * The day's photos, and the caption for whichever one is open.
 *
 * The caption editor is INLINE, expanding beneath the strip, rather than a
 * second modal. A modal over a drawer is a focus-trap problem and reads as a
 * dead end on a phone — two dismiss gestures deep to get back to a sheet that
 * was itself opened by a tap.
 *
 * Selecting a thumbnail is what opens its caption, so the strip needs a
 * selected state where nothing else in this feature does. It is a border, not
 * a plate: the tile is already an image, and a background behind an image is
 * invisible.
 */
export function PhotoStrip({
  photos,
  pending,
  dateLabel,
  onPick,
  onCaption,
  onRemove,
}: {
  photos: DayPhotoRow[];
  pending: PendingPhoto[];
  dateLabel: string;
  onPick: (files: File[]) => void;
  onCaption: (id: string, caption: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations('dashboard.health');
  const inputRef = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const total = photos.length + pending.length;
  const isFull = total >= MAX_PHOTOS_PER_DAY;
  const open = photos.find((photo) => photo.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{t('day.photos')}</span>
        <span className="text-sm text-muted-foreground">
          {isFull
            ? t('day.photoFull', { max: MAX_PHOTOS_PER_DAY })
            : t('day.photoCount', { count: total })}
        </span>
      </div>

      {/* Horizontal scroll INSIDE its own container. The sheet's body must
          never scroll sideways — a horizontally scrolling page is how a
          drawer starts fighting its own swipe-to-dismiss. */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {photos.map((photo) => (
          <PhotoThumb
            key={photo.id}
            src={photo.url}
            alt={t('day.photoAlt', { date: dateLabel })}
            caption={photo.caption}
            removeLabel={t('day.photoRemove')}
            isSelected={photo.id === openId}
            onSelect={() => setOpenId(photo.id === openId ? null : photo.id)}
            onRemove={() => {
              if (photo.id === openId) setOpenId(null);
              onRemove(photo.id);
            }}
          />
        ))}

        {pending.map((item) => (
          <PhotoThumb
            key={item.tempId}
            src={item.previewUrl}
            alt={t('day.photoUploading')}
            caption={null}
            pending
            removeLabel={t('day.photoRemove')}
          />
        ))}

        {isFull ? null : (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label={t('day.addPhoto')}
              className={cn(
                'flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl',
                'border-2 border-dashed border-muted-foreground/35 text-muted-foreground',
                'transition-[border-color,color,transform] duration-200 ease-out motion-reduce:transition-none',
                'hover:border-muted-foreground/60 hover:text-foreground',
                'active:scale-95 motion-reduce:active:scale-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
              )}
            >
              <ImagePlus aria-hidden className="size-6" />
            </button>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_PHOTO_MIME_TYPES.join(',')}
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                // Reset first: picking the same file twice in a row fires no
                // change event otherwise, and the second pick silently does
                // nothing.
                event.target.value = '';
                if (files.length > 0) onPick(files);
              }}
            />
          </>
        )}
      </div>

      {open ? (
        <div className="space-y-2 rounded-2xl bg-muted/50 p-3">
          {/* AutoGrowingTextarea has no `id` prop, so a `htmlFor` pairing
              would not resolve. Wrapping the control inside the label makes
              the association structural instead of by id. */}
          <label className="block space-y-2 text-xs font-medium text-muted-foreground">
            {t('day.caption')}
            <AutoGrowingTextarea
              key={open.id}
              value={open.caption ?? ''}
              placeholder={t('day.captionPlaceholder')}
              // Saved on blur rather than per keystroke: a caption is a
              // sentence, and a write per character is a write per character.
              onChange={(next) =>
                onCaption(open.id, next.length > 0 ? next : null)
              }
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
