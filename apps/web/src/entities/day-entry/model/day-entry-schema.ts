import * as z from 'zod';

import {
  parseReflection,
  reflectionPlainText,
} from '@/entities/day-entry/lib/reflection-content';

/** ZOD 3.25.76: no `z.iso.*` namespace (that is zod 4). Use
 *  `z.string().date()` and `z.string().datetime()`. */

/** A UI ceiling, not a storage one — past this a reflection is a document,
 *  which is what `/notes` is for. It measures the TEXT typed, never the
 *  stored JSON, whose envelope would refuse a formatted entry far earlier. */
export const MAX_REFLECTION_LENGTH = 10_000;

/** A generous ceiling on the STORED string, guarding against a pathological
 *  payload — deeply nested marks, a huge attribute — regardless of how little
 *  prose it measures out to. */
const MAX_STORED_REFLECTION_LENGTH = 200_000;

/** A caption is a line under a photo, not a paragraph. */
export const MAX_CAPTION_LENGTH = 500;

/**
 * A stored `reflection`: legacy plain text or Tiptap JSON, one `@db.Text`
 * column either way. The `max` guards the raw string, the refinement counts
 * the PROSE — so a 9 000-character legacy row still validates unchanged.
 */
const reflectionSchema = z
  .string()
  .max(MAX_STORED_REFLECTION_LENGTH)
  .nullable()
  .refine(
    (value) =>
      value === null ||
      reflectionPlainText(parseReflection(value)).length <=
        MAX_REFLECTION_LENGTH,
    {
      message: `Reflection must be ${MAX_REFLECTION_LENGTH} characters or fewer`,
    }
  );

/**
 * The write. `localDate` IS client-supplied here, unlike `upsertSleepLog`: an
 * entry has no instant to derive a day from, it is about a day the owner
 * points at, and the guard is that it cannot be in the future.
 *
 * `todayKey` travels with it because "today" is a fact about the OWNER's
 * timezone. It bounds the entry rather than dating it, so lying about it can
 * only refuse the client a day it could otherwise have written.
 */
export const dayEntryUpsertSchema = z
  .object({
    localDate: z.string().date(),
    mood: z.number().int().min(1).max(5).nullable(),
    reflection: reflectionSchema,
    todayKey: z.string().date(),
  })
  .refine((v) => v.localDate <= v.todayKey, {
    message: 'Cannot write a journal entry for a future day',
    path: ['localDate'],
  });

export type DayEntryUpsertInput = z.infer<typeof dayEntryUpsertSchema>;

/** A read window. Inclusive at both ends; the caller supplies calendar days. */
export const dayEntryRangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((v) => v.from <= v.to, {
    message: 'from must not be after to',
    path: ['from'],
  });

export type DayEntryRangeInput = z.infer<typeof dayEntryRangeSchema>;

/** Which day a batch of photos belongs to. The files themselves are validated
 *  by `findPhotoViolation`, not here: zod cannot usefully describe a `File`. */
export const dayPhotoUploadSchema = z
  .object({
    localDate: z.string().date(),
    todayKey: z.string().date(),
  })
  .refine((v) => v.localDate <= v.todayKey, {
    message: 'Cannot attach a photo to a future day',
    path: ['localDate'],
  });

export type DayPhotoUploadInput = z.infer<typeof dayPhotoUploadSchema>;

export const dayPhotoCaptionSchema = z.object({
  id: z.string().min(1),
  caption: z.string().max(MAX_CAPTION_LENGTH).nullable(),
});

export type DayPhotoCaptionInput = z.infer<typeof dayPhotoCaptionSchema>;

export const dayPhotoIdSchema = z.object({ id: z.string().min(1) });
