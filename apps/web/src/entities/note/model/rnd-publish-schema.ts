/**
 * The wire contract for `POST /api/rnd/publish`.
 *
 * Unlike every other note input, this one arrives from outside the app — a
 * script on a machine, holding a long-lived token. It is validated harder than
 * a form would be: the path grammar is a whitelist rather than a blacklist,
 * and `rnd_path` is refused outright because the server writes it and a
 * client-supplied value would repoint an upsert at another note.
 */
import { z } from 'zod';

/**
 * A project-relative markdown path. No leading slash, no `..` segment, no
 * backslash, and it must end in `.md`.
 *
 * `..` is rejected here rather than normalised away: a payload that contains
 * one is not a payload this tool produces, so the useful response is a 400
 * naming the file, not a quiet reinterpretation of what the sender meant.
 */
const rndFilePath = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9._/-]*)\.md$/, 'must be a relative .md path')
  .refine((value) => !value.split('/').includes('..'), 'must not contain ".."')
  .refine((value) => !value.includes('//'), 'must not contain an empty path segment');

/**
 * A frontmatter value. Scalars, plus the one array `tags`.
 *
 * `Note.properties` is a key→scalar map; anything nested has nowhere to land,
 * and flattening it here would invent a convention the editor does not share.
 *
 * Bounded to match `notePropertyValueSchema` (`note-schema.ts`) — 500
 * characters — not some looser number of our own: these values land directly
 * in `Note.properties` (`publish-rnd-project.ts`'s upsert), and
 * `updateNoteSchema` enforces that same 500-character cap on every property
 * edit. `note-properties-panel.tsx` sends the WHOLE properties record on
 * every edit, so one frontmatter value published over the app's own bound
 * makes the note un-editable from then on — adding or changing *any*
 * property fails validation, not just the oversized one.
 *
 * The array case needs its own bound, not just a per-item one: `tags` is
 * flattened to a single joined string server-side
 * (`value.join(', ')`), so what actually has to fit under 500 is the JOINED
 * result, not any individual element — bounding the elements alone would
 * still let 50 × 200-char tags join into ~10,000 characters.
 */
const frontmatterValue = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
  z
    .array(z.string().max(500))
    .max(50)
    .refine((tags) => tags.join(', ').length <= 500, {
      message: 'joined array value would exceed 500 characters, the bound the app enforces on one property',
    }),
]);

const rndFile = z.object({
  path: rndFilePath,
  frontmatter: z
    .record(
      // Matches `updateNoteSchema`'s key bound (`note-schema.ts`) for the
      // same reason the value does: a key over 60 characters publishes fine
      // here and then can never be renamed or re-saved from the panel.
      z.string().trim().min(1).max(60),
      frontmatterValue
    )
    .refine((fm) => typeof fm.title === 'string' && fm.title.trim().length > 0, {
      message: 'frontmatter.title is required',
    })
    .refine((fm) => !('rnd_path' in fm) && !('rnd_project' in fm), {
      message: 'rnd_path and rnd_project are written by the server and may not be supplied',
    })
    .refine(
      (fm) => {
        // `updateNoteSchema` caps a note at 40 properties, but the frontmatter
        // key count is not the same number as the eventual `Note.properties`
        // key count: `title` and `status` own columns and are dropped before
        // writing (`publish-rnd-project.ts`'s `COLUMN_KEYS`), while
        // `rnd_path` and `rnd_project` are added unconditionally as the
        // note's identity. So the record that lands in `properties` is
        // (frontmatter keys minus title/status) + 2 — bound THAT to 40, not
        // the frontmatter key count, or a file with title + status + 38 other
        // keys would publish clean and land exactly one property short of
        // ever being editable again.
        const nonColumnKeys = Object.keys(fm).filter((key) => key !== 'title' && key !== 'status');
        return nonColumnKeys.length + 2 <= 40;
      },
      { message: 'too many properties: frontmatter keys other than title/status may not exceed 38' }
    ),
  // Generous, but bounded: an experiment note with a large metrics table is
  // still far under this, and an unbounded body is a memory bug waiting for a
  // misconfigured script.
  markdown: z.string().max(400_000),
});

export const rndPublishSchema = z.object({
  project: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'must be a lowercase slug'),
  title: z.string().min(1).max(200),
  notesRoot: z
    .string()
    .min(1)
    .max(200)
    .refine((value) => !value.split('/').includes('..'), 'must not contain ".."')
    .refine((value) => !value.startsWith('/'), 'must be a vault-relative path'),
  files: z.array(rndFile).min(1).max(200),
  deleted: z.array(rndFilePath).max(200).default([]),
});

export type RndPublishInput = z.infer<typeof rndPublishSchema>;
export type RndPublishFile = z.infer<typeof rndFile>;
