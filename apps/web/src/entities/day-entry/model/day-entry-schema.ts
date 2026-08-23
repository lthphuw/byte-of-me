import * as z from 'zod';

/**
 * NOTE ON ZOD VERSION: this repo is on zod 3.25.76, where the `z.iso.*`
 * namespace does not exist — it arrived in zod 4. Use `z.string().date()` and
 * `z.string().datetime()`.
 */

/** The `reflection` column is `@db.Text`, so this ceiling is a UI decision
 *  rather than a storage one: past ten thousand characters the textarea stops
 *  being a journal field and starts being a document, which is what `/notes`
 *  is for. */
export const MAX_REFLECTION_LENGTH = 10_000;

/** A caption is a line under a photo, not a paragraph. */
export const MAX_CAPTION_LENGTH = 500;

/**
 * The write.
 *
 * `localDate` IS supplied by the client here, which is the opposite of
 * `upsertSleepLog` — and deliberately so. A sleep log's day is DERIVED from
 * the wake instant because letting a caller name it would put the column both
 * health domains join on under the caller's control. A journal entry has no
 * instant to derive anything from: it is about a day the owner points at. So
 * the day is sent, and the guard is that it cannot be in the future.
 *
 * `todayKey` travels with it rather than being read from the server clock,
 * because "today" is a fact about the OWNER's timezone and the server has no
 * reliable way to know it. It bounds the entry rather than dating it, so a
 * client lying about it can only refuse itself a day it could otherwise write.
 */
export const dayEntryUpsertSchema = z
  .object({
    localDate: z.string().date(),
    mood: z.number().int().min(1).max(5).nullable(),
    reflection: z.string().max(MAX_REFLECTION_LENGTH).nullable(),
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
