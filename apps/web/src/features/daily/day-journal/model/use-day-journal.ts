'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  type DayEntryRow,
  type DayPhotoRow,
  deleteDayPhoto,
  describePhotoViolation,
  findPhotoViolation,
  updateDayPhotoCaption,
  uploadDayPhotos,
  upsertDayEntry,
} from '@/entities/day-entry';
// Deep path, not the slice barrel: the barrel re-exports the write actions
// above, and `uploadDayPhotos` reaches `sharp` through them.
import {
  parseReflection,
  serializeReflection,
} from '@/entities/day-entry/lib/reflection-content';
import { useWorkspaceSettings } from '@/entities/workspace-settings';
import type { PendingPhoto } from '@/features/daily/day-journal/ui/photo-strip';
import { compressInBrowser } from '@/shared/lib/media/compress-in-browser';

/**
 * The day's mood, words and photos, as one draft.
 *
 * **Text saves on Save; photos save on pick.** A `File` cannot be held in
 * state across a drawer close, and five 3 MB files in one server action
 * request exceed `serverActions.bodySizeLimit`. So a picked photo uploads
 * immediately, which means choosing photos and then dismissing the sheet
 * without saving still leaves them attached. That is a real asymmetry and the
 * UI draws it — a spinner while it uploads, a delete control once it is
 * stored — rather than hiding it.
 *
 * Captions are the same: written on blur, straight through, because a caption
 * typed under one photo should not queue behind a Save button that is about
 * the reflection.
 *
 * Optimistic on the photo list, because the round trip is a file upload and
 * the reader is looking at the picture they just chose. The pending entries
 * carry `blob:` preview URLs, which this hook revokes — the browser holds the
 * whole file in memory until something does.
 */
export function useDayJournal({
  localDate,
  todayKey,
  entry,
}: {
  localDate: string;
  todayKey: string;
  entry: DayEntryRow | null;
}) {
  const t = useTranslations('dashboard.daily');
  // Seeded server-side by `space/layout.tsx` — the owner's real compression
  // settings, the same source the media library reads.
  const { settings } = useWorkspaceSettings();

  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [reflection, setReflection] = useState<JSONContent | null>(() =>
    parseReflection(entry?.reflection ?? null)
  );
  const [photos, setPhotos] = useState<DayPhotoRow[]>(entry?.photos ?? []);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Every `blob:` URL this hook has minted, so unmount can revoke them all.
  // Without this the browser holds each picked file in memory for the life of
  // the document — five photos is fifteen megabytes that never comes back.
  const previewUrls = useRef<string[]>([]);
  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current = [];
    },
    []
  );

  const pickPhotos = useCallback(
    async (files: File[]) => {
      // Compress BEFORE validating size, same as the media library's
      // `ImageUpload` — an ordinary phone photo arrives well over
      // `MAX_PHOTO_SIZE_MB` and would compress comfortably under it, so
      // checking the as-picked bytes rejects a photo that never actually
      // uploads at that size. `compressInBrowser` is a no-op for SVG/GIF/a
      // disabled config, so this is safe to run unconditionally.
      const compressed = await Promise.all(
        files.map((file) => compressInBrowser(file, settings.imageCompression))
      );

      const violation = findPhotoViolation(compressed, photos.length);
      if (violation) {
        toast.error(describePhotoViolation(violation));
        return;
      }

      const items: PendingPhoto[] = compressed.map((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrls.current.push(previewUrl);

        return { tempId: `${Date.now()}-${index}`, previewUrl };
      });

      setPending((current) => [...current, ...items]);

      const res = await uploadDayPhotos({ localDate, todayKey }, compressed);

      setPending((current) =>
        current.filter((item) => !items.some((i) => i.tempId === item.tempId))
      );
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));

      if (!res.success) {
        toast.error(res.errorMsg || t('day.errorUpload'));
        return;
      }

      setPhotos((current) => [...current, ...res.data]);
    },
    [localDate, todayKey, photos.length, settings.imageCompression, t]
  );

  const setCaption = useCallback(
    async (id: string, caption: string | null) => {
      // Optimistic: the reader typed it, and a caption that flickers back to
      // its old value while a round trip completes reads as a lost edit.
      //
      // The previous caption is captured from the functional updater rather
      // than read off `photos` directly, so this callback needs no `photos`
      // dependency and can never roll back to a stale value from a render
      // this closure was created in.
      let previousCaption: string | null = null;
      setPhotos((current) =>
        current.map((photo) => {
          if (photo.id !== id) return photo;
          previousCaption = photo.caption;
          return { ...photo, caption };
        })
      );

      const res = await updateDayPhotoCaption({ id, caption });
      if (!res.success) {
        // Roll back, same as `removePhoto` below. Without this a failed save
        // leaves the strip showing text that was never persisted — the toast
        // fades in a few seconds and the UI keeps lying about the caption
        // until the next reload, when it silently reverts on its own.
        setPhotos((current) =>
          current.map((photo) =>
            photo.id === id ? { ...photo, caption: previousCaption } : photo
          )
        );
        toast.error(res.errorMsg || t('day.errorSave'));
      }
    },
    [t]
  );

  const removePhoto = useCallback(
    async (id: string) => {
      const previous = photos;
      setPhotos((current) => current.filter((photo) => photo.id !== id));

      const res = await deleteDayPhoto({ id });
      if (!res.success) {
        // Put it back. A photo that vanishes from the strip and stays gone
        // until a reload is worse than one that never left.
        setPhotos(previous);
        toast.error(res.errorMsg || t('day.errorDelete'));
      }
    },
    [photos, t]
  );

  const saveAsync = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await upsertDayEntry({
        localDate,
        mood,
        reflection: serializeReflection(reflection),
        todayKey,
      });

      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    } finally {
      setIsSaving(false);
    }
  }, [localDate, todayKey, mood, reflection]);

  // Compared as SERIALISED strings, not documents by identity: Tiptap
  // re-creates nodes on every edit, so an identity comparison would mark
  // the sheet dirty on every keystroke — and worse, could report dirty when
  // nothing actually changed, prompting a "discard changes?" on close.
  //
  // BOTH sides go through the same codec, not just the live one. Comparing
  // `serializeReflection(reflection)` against the raw `entry.reflection`
  // string looked correct but wasn't: a legacy plain-text row round-trips
  // through `parseReflection` into a doc and back out through
  // `serializeReflection` as JSON, which can never byte-match the original
  // plain string. That reported every legacy day dirty the instant it was
  // opened, before anyone touched it. Serialising `entry.reflection`
  // through the same `parseReflection` → `serializeReflection` pass it took
  // to seed `reflection` in the first place makes a legacy row compare
  // clean until it is actually edited, while a row already stored as JSON
  // still compares exactly as before.
  //
  // Memoised: this reruns `parseReflection` plus two `JSON.stringify` passes
  // over the document, and `reflection` changes on every keystroke. Without
  // memoisation that work reran on every render for no reader — see the note
  // below, this value currently has no consumer.
  //
  // NOTE: nothing reads `isDirty` today (`day-modal.tsx` reads
  // `sleep.isDirty`, not this hook's). Kept because it is part of this
  // hook's public shape and a discard-changes prompt is a plausible next use
  // — but it is not load-bearing for anything that exists right now.
  const isDirty = useMemo(
    () =>
      mood !== (entry?.mood ?? null) ||
      serializeReflection(reflection) !==
        serializeReflection(parseReflection(entry?.reflection ?? null)),
    [mood, reflection, entry?.mood, entry?.reflection]
  );

  return {
    mood,
    setMood,
    reflection,
    setReflection,
    photos,
    pending,
    pickPhotos,
    setCaption,
    removePhoto,
    isDirty,
    isSaving,
    saveAsync,
  };
}
