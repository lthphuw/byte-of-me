import * as z from 'zod';

import {
  parseReflection,
  reflectionPlainText,
} from '@/entities/day-entry/lib/reflection-content';

/**
 * NOTE ON ZOD VERSION: this repo is on zod 3.25.76, where the `z.iso.*`
 * namespace does not exist — it arrived in zod 4. Use `z.string().date()` and
 * `z.string().datetime()`.
 */

/** The `reflection` column is `@db.Text`, so this ceiling is a UI decision
 *  rather than a storage one: past ten thousand characters a reflection stops
 *  being a journal field and starts being a document, which is what `/notes`
 *  is for. It measures the TEXT a person typed, not the stored string — the
 *  column now holds stringified Tiptap JSON, and counting the envelope (node
 *  types, marks, brackets) against the same 10 000 would refuse a formatted
 *  reflection at a fraction of the prose it used to allow. See
 *  `reflectionPlainText` / `parseReflection` in `../lib/reflection-content`. */
export const MAX_REFLECTION_LENGTH = 10_000;

/** A separate, generous ceiling on the STORED string itself, independent of
 *  how much prose it measures out to. `MAX_REFLECTION_LENGTH` bounds what a
 *  person wrote, not what the JSON envelope costs to represent it — this
 *  guards against a pathological payload (deeply nested marks, a huge
 *  attribute) landing in the database regardless. */
const MAX_STORED_REFLECTION_LENGTH = 200_000;

/** A caption is a line under a photo, not a paragraph. */
export const MAX_CAPTION_LENGTH = 500;

/**
 * A stored `reflection` value: plain text (every row written before this
 * change) or stringified Tiptap JSON, in the same `@db.Text` column either
 * way — see `reflection-content.ts`. `MAX_STORED_REFLECTION_LENGTH` guards
 * the raw string against a pathological payload; the refinement measures
 * against `MAX_REFLECTION_LENGTH`, which is about prose, by parsing the
 * value back to a document and counting its text. A 9 000-character legacy
 * plain-text row still validates: `parseReflection` wraps it one paragraph
 * per line and `reflectionPlainText` returns the same 9 000 characters back.
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
