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
export type MoveNoteInput = z.input<typeof moveNoteSchema>;
export type SetNoteLabelsInput = z.input<typeof setNoteLabelsSchema>;
export type SearchNotesInput = z.input<typeof searchNotesSchema>;
