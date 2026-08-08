import * as z from 'zod';

/**
 * `role` is validated as a closed set here even though the column is a plain
 * String: the database accepts anything, so this is the only point a caller's
 * value is checked before it becomes a permission.
 */
export const noteShareRoleSchema = z.enum(['VIEWER', 'EDITOR']);

export const shareNoteSchema = z.object({
  noteId: z.string().min(1),
  /**
   * Lowercased here so the stored value already matches what
   * `resolveNoteAccess` looks up. `normalizeEmail` in the action itself is
   * belt and braces — this schema is not the only way a row gets written.
   */
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  role: noteShareRoleSchema.default('VIEWER'),
});

export const updateNoteShareRoleSchema = z.object({
  shareId: z.string().min(1),
  role: noteShareRoleSchema,
});

export const moveShareExposureSchema = z.object({
  noteId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
});

export const updateSharedNoteSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  /**
   * Stringified Tiptap JSON carrying `/shared/notes/` hrefs, which
   * `updateSharedNote` maps back before persisting.
   *
   * `plainText` is absent for the reason `note-schema.ts` gives: it is
   * derived from `content` on the server, and accepting it from the client
   * would let a caller desynchronise the search index from the document.
   */
  content: z.string().optional(),
});

/** `z.input`, not `z.infer` — see the note in `note-schema.ts` for why. */
export type ShareNoteInput = z.input<typeof shareNoteSchema>;
export type UpdateNoteShareRoleInput = z.input<typeof updateNoteShareRoleSchema>;
export type MoveShareExposureInput = z.input<typeof moveShareExposureSchema>;
export type UpdateSharedNoteInput = z.input<typeof updateSharedNoteSchema>;
