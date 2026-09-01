'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AutoGrowingTextarea } from '@byte-of-me/ui';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PhotoThumb } from './photo-thumb';

import type { DayPhotoRow } from '@/entities/day-entry';
import { MAX_PHOTOS_PER_DAY } from '@/entities/day-entry';
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
 * The caption editor is INLINE: a modal over a drawer is a focus trap and two
 * dismiss gestures deep. Selection is a border, not a plate — the tile is
 * already an image, and a background behind an image is invisible.
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
  const t = useTranslations('dashboard.daily');
  const inputRef = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const total = photos.length + pending.length;
  const isFull = total >= MAX_PHOTOS_PER_DAY;
  const open = photos.find((photo) => photo.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{t('day.photos')}</h3>
        <span className="text-sm text-muted-foreground">
          {isFull
            ? t('day.photoFull', { max: MAX_PHOTOS_PER_DAY })
            : t('day.photoCount', { count: total })}
        </span>
      </div>

      {/* Horizontal scroll INSIDE its own container: the sheet's body must
          never scroll sideways. */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {photos.map((photo) => (
          <PhotoThumb
            key={photo.id}
            src={photo.url}
            alt={t('day.photoAlt', { date: dateLabel })}
            caption={photo.caption}
            isSelected={photo.id === openId}
            onSelect={() => setOpenId(photo.id === openId ? null : photo.id)}
          />
        ))}

        {pending.map((item) => (
          <PhotoThumb
            key={item.tempId}
            src={item.previewUrl}
            alt={t('day.photoUploading')}
            caption={null}
            pending
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
              // `image/*`, not the MIME list: only a generic type makes iOS
              // and Android offer "Take Photo", and never `capture`, which
              // FORCES the camera. `findPhotoViolation` is the real check.
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                // Reset first, or picking the same file twice fires no second
                // change event.
                event.target.value = '';
                if (files.length > 0) onPick(files);
              }}
            />
          </>
        )}
      </div>

      {/* Caption and removal together. Remove is a labelled full-width
          button, not a 24px disc over the tile a thumb is aiming at. */}
      {open ? (
        <div className="space-y-3 rounded-2xl bg-muted/50 p-3">
          <PhotoCaptionEditor
            key={open.id}
            photoId={open.id}
            initialCaption={open.caption}
            label={t('day.caption')}
            placeholder={t('day.captionPlaceholder')}
            onCaption={onCaption}
          />

          <button
            type="button"
            onClick={() => {
              setOpenId(null);
              onRemove(open.id);
            }}
            className={cn(
              'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-background px-3',
              'text-sm text-destructive-text',
              'transition-colors duration-200 motion-reduce:transition-none hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
            )}
          >
            <Trash2 aria-hidden className="size-4 shrink-0" />
            {t('day.photoRemove')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One photo's caption, buffered locally and written once on blur.
 * `AutoGrowingTextarea.onChange` fires per character, so writing from it sent
 * 40 unordered requests per 40-character caption and kept whichever won.
 *
 * `key={open.id}` upstream resets the draft; the unmount flush covers a blur
 * that never fires.
 */
function PhotoCaptionEditor({
  photoId,
  initialCaption,
  label,
  placeholder,
  onCaption,
}: {
  photoId: string;
  initialCaption: string | null;
  label: string;
  placeholder: string;
  onCaption: (id: string, caption: string | null) => void;
}) {
  const [draft, setDraft] = useState(initialCaption ?? '');

  // A ref, so the flush sees the latest keystroke rather than whatever
  // `draft` was when the callback was created.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const committedRef = useRef(initialCaption ?? '');

  const flush = useCallback(() => {
    if (draftRef.current === committedRef.current) return;
    committedRef.current = draftRef.current;
    onCaption(photoId, draftRef.current.length > 0 ? draftRef.current : null);
  }, [photoId, onCaption]);

  useEffect(() => () => flush(), [flush]);

  return (
    // `AutoGrowingTextarea` has no `id` prop, so the association has to be
    // structural rather than by `htmlFor`.
    <label className="block space-y-2 text-xs font-medium text-muted-foreground">
      {label}
      <AutoGrowingTextarea
        value={draft}
        placeholder={placeholder}
        onChange={setDraft}
        onBlur={flush}
      />
    </label>
  );
}
