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
 */
const frontmatterValue = z.union([
  z.string().max(2000),
  z.number(),
  z.boolean(),
  z.array(z.string().max(200)).max(50),
]);

const rndFile = z.object({
  path: rndFilePath,
  frontmatter: z
    .record(frontmatterValue)
    .refine((fm) => typeof fm.title === 'string' && fm.title.trim().length > 0, {
      message: 'frontmatter.title is required',
    })
    .refine((fm) => !('rnd_path' in fm), {
      message: 'rnd_path is written by the server and may not be supplied',
    }),
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
