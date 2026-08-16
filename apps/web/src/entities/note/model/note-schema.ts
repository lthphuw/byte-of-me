import * as z from 'zod';

/**
 * `plainText` is absent from every schema on purpose. It is derived from
 * `content` on the server (`richTextToPlainText`); accepting it from the client
 * would let a caller desynchronise the search index from the document.
 */

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  parentId: z.string().min(1).nullable().optional(),
  /** An Obsidian-style folder: a pure container in the same tree. */
  isFolder: z.boolean().optional(),
});

/** Scalar a note property can hold — mirrors `NotePropertyValue` in types.ts. */
export const notePropertyValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
]);

export const updateNoteSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  /** Stringified Tiptap JSON. */
  content: z.string().optional(),
  status: z.string().trim().min(1).max(50).optional(),
  properties: z
    .record(z.string().trim().min(1).max(60), notePropertyValueSchema)
    .refine((rec) => Object.keys(rec).length <= 40, {
      message: 'Too many properties',
    })
    .optional(),
  isPinned: z.boolean().optional(),
});

/**
 * A rename's follow-up: rewrite the anchor text of every link pointing AT
 * this note, in the notes that link to it.
 *
 * `previousTitle` is deliberately NOT trimmed, while `nextTitle` is. They are
 * two different things wearing the same type. `previousTitle` is matched
 * character-for-character against text stored inside somebody's document, so
 * trimming it here would silently widen the match past what
 * `relabelNoteLinks` promises — and the whole value of that promise is that a
 * hand-edited label survives. `nextTitle` is text about to be written, and is
 * trimmed for the same reason `createNoteSchema`/`updateNoteSchema` trim
 * `title`: the label must end up identical to the title that was persisted,
 * or the next rename will not recognise its own handiwork.
 *
 * `dryRun` is optional rather than defaulted so the shape stays additive
 * (§11.6) and the dangerous value — actually writing — is never the one a
 * caller gets by leaving the field out incorrectly; it is the one they get by
 * calling the action at all, which is already the point of calling it.
 */
export const relabelInboundNoteLinksSchema = z.object({
  noteId: z.string().min(1),
  previousTitle: z.string().min(1).max(200),
  nextTitle: z.string().trim().min(1).max(200),
  dryRun: z.boolean().optional(),
});

export const moveNoteSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  position: z.number().int().min(0),
  /**
   * Set by the confirmation the explorer shows when the destination sits
   * inside a shared subtree — moving in there grants access to everyone who
   * can already open it.
   *
   * Optional so every existing caller keeps working unchanged (AGENTS §11.6);
   * its ABSENCE is what `moveNote` refuses on, so a caller that has not been
   * taught about sharing fails closed rather than exposing a note silently.
   */
  acknowledgeSharedDestination: z.boolean().optional(),
});

export const setNoteLabelsSchema = z.object({
  noteId: z.string().min(1),
  /** The COMPLETE next label set — replace semantics, not merge. */
  names: z.array(z.string().trim().min(1).max(40)).max(20),
});

export const searchNotesSchema = z.object({
  query: z.string().trim().max(200).default(''),
  includeArchived: z.boolean().default(false),
  page: z.number().int().optional(),
  limit: z.number().int().optional(),
});

/**
 * `z.input`, not `z.infer`. These types name what a *caller* passes, and
 * `z.infer` resolves to the schema's OUTPUT type — where a field carrying
 * `.default()` has become required, because by then the default has been
 * applied. Typing `SearchNotesInput` from `z.infer` would force every caller to
 * pass `query` and `includeArchived` explicitly, which is precisely what those
 * defaults exist to avoid.
 *
 * The three schemas without defaults infer identically either way; they use
 * `z.input` too so the name and the type agree and nobody has to work out which
 * schema has a default. Inside an action, `parseInput(...).data` is still the
 * output type, so the defaults are present where the query is built.
 */
export type CreateNoteInput = z.input<typeof createNoteSchema>;
export type UpdateNoteInput = z.input<typeof updateNoteSchema>;
export type RelabelInboundNoteLinksInput = z.input<
  typeof relabelInboundNoteLinksSchema
>;
export type MoveNoteInput = z.input<typeof moveNoteSchema>;
export type SetNoteLabelsInput = z.input<typeof setNoteLabelsSchema>;
export type SearchNotesInput = z.input<typeof searchNotesSchema>;

/**
 * Input to every whole-vault maintenance batch — `rebuildLinkGraph`,
 * `rebuildSearchIndex`, `scanStaleNoteLinks`.
 *
 * `limit` is deliberately unbounded here. A page size out of range is not a bad
 * request; it is a progress bar asking for more work than it should get, and
 * failing a job halfway through over an argument the server can simply correct
 * would strand the vault with half its derived data rebuilt. `clampBatchLimit`
 * in `model/maintenance.ts` does the correcting, as `getNotesPage` does for its
 * own page size.
 *
 * `cursor` refuses the empty string rather than reading it as "start". These
 * jobs are resumable and the cursor is the only thing carrying that state: a
 * caller that sends `''` has lost its place, and silently restarting from the
 * top would look like progress while re-doing work already done.
 *
 * No `BatchJobInput` alias is exported from here on purpose — that name already
 * belongs to `model/maintenance.ts`, where it is dependency-free so the client
 * driving the progress bar can name it without pulling zod into the bundle. Two
 * names for one shape is how the two drift.
 */
export const batchJobSchema = z.object({
  cursor: z.string().min(1).nullable().optional(),
  limit: z.number().optional(),
});
