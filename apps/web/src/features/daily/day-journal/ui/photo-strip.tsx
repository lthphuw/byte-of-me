'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AutoGrowingTextarea } from '@byte-of-me/ui';
import { ImagePlus } from 'lucide-react';
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
  const t = useTranslations('dashboard.daily');
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
        {photos.map((photo, index) => (
          <PhotoThumb
            key={photo.id}
            src={photo.url}
            alt={t('day.photoAlt', { date: dateLabel })}
            caption={photo.caption}
            // Five thumbnails otherwise all announce as "Remove this photo" —
            // indistinguishable to a screen reader. The caption disambiguates
            // when there is one; the photo's position in the strip does when
            // there isn't.
            removeLabel={
              photo.caption
                ? `${t('day.photoRemove')} — ${photo.caption}`
                : t('day.photoRemoveNumbered', { n: index + 1 })
            }
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
              // `image/*`, not `ACCEPTED_PHOTO_MIME_TYPES.join(',')`. A
              // generic type is what makes iOS and Android offer "Take
              // Photo" beside "Photo Library" — a list of five explicit MIME
              // types does not. This is only a picker filter: drag-and-drop
              // and "All Files" bypass it, so `findPhotoViolation` stays the
              // real check and keeps its explicit list.
              //
              // Deliberately NOT adding `capture` here. It looks like the
              // obvious way to add a camera button and does the opposite of
              // what is wanted: it FORCES the camera and removes the library
              // option entirely.
              accept="image/*"
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
          <PhotoCaptionEditor
            key={open.id}
            photoId={open.id}
            initialCaption={open.caption}
            label={t('day.caption')}
            placeholder={t('day.captionPlaceholder')}
            onCaption={onCaption}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One photo's caption, buffered locally and persisted on blur.
 *
 * `AutoGrowingTextarea.onChange` fires per character — it has to, to resize
 * itself as the reader types — so calling `onCaption` straight from it, as
 * this used to, fired one un-serialised write per keystroke. A 40-character
 * caption was 40 concurrent requests with no ordering guarantee: if `"hell"`
 * landed after `"hello"`, the database kept `"hell"`, and the optimistic
 * rollback in `use-day-journal.ts` could then restore that stale value again
 * on top of whatever arrived later. Keeping the draft in local state and
 * writing once, on blur, is what actually delivers the "saved on blur" this
 * component always claimed.
 *
 * `key={open.id}` on the caller remounts this whenever the selected photo
 * changes, which is what resets the local draft — no effect needs to watch
 * `photoId` for that. The unmount flush below is a second line of defence
 * for the case blur never fires at all: the sheet swiped shut, or the
 * component unmounting some other way mid-edit.
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

  // Read inside a ref so the flush below always sees the latest keystroke,
  // not whatever `draft` happened to be when the callback was created.
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
    // AutoGrowingTextarea has no `id` prop, so a `htmlFor` pairing would not
    // resolve. Wrapping the control inside the label makes the association
    // structural instead of by id.
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
