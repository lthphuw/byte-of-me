import { z } from 'zod';

/**
 * The top level of a TipTap document. Blocks stay loose: the editor owns their
 * schema, and this only rejects a value that is not a document at all.
 */
export const richTextDocSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export type RichTextDoc = z.infer<typeof richTextDocSchema>;
