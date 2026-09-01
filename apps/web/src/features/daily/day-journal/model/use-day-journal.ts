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
 * **Text saves on Save; photos and captions save on pick.** A `File` survives
 * no drawer close, and five 3 MB files exceed `serverActions.bodySizeLimit`.
 * The photo list is optimistic; the UI draws the asymmetry rather than hide it.
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
  // Seeded server-side by `space/layout.tsx`, same source as the media library.
  const { settings } = useWorkspaceSettings();

  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [reflection, setReflection] = useState<JSONContent | null>(() =>
    parseReflection(entry?.reflection ?? null)
  );
  const [photos, setPhotos] = useState<DayPhotoRow[]>(entry?.photos ?? []);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Every `blob:` URL minted here, so unmount can revoke them all: otherwise
  // the browser holds five picked photos — fifteen megabytes — for the life
  // of the document.
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
      // Compress BEFORE validating size, like `ImageUpload`: a phone photo
      // arrives over `MAX_PHOTO_SIZE_MB` and compresses well under it. A
      // no-op for SVG/GIF/a disabled config, so it runs unconditionally.
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
      // Optimistic: a caption that flickers back mid-round-trip reads as a
      // lost edit. The old value comes from the functional updater, so this
      // needs no `photos` dependency and cannot roll back to a stale one.
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
        // Roll back: otherwise the strip keeps showing text that was never
        // persisted, long after the toast has faded.
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
        // Put it back — gone-until-reload is worse than never left.
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

  // Deliberately state-free: the undo toast outlives the sheet that raised
  // it, so this must be a plain closure over the row it was seeded with.
  const restoreAsync = useCallback(async () => {
    const res = await upsertDayEntry({
      localDate,
      mood: entry?.mood ?? null,
      reflection: entry?.reflection ?? null,
      todayKey,
    });

    if (!res.success) throw new Error(res.errorMsg);

    return res.data;
  }, [localDate, todayKey, entry?.mood, entry?.reflection]);

  // SERIALISED strings, both sides through the same codec: Tiptap re-creates
  // nodes on every edit, and a legacy plain-text row can never byte-match its
  // own JSON round trip — either comparison reports every day dirty on open.
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
    restoreAsync,
  };
}
