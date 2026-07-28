import { z } from 'zod';

/**
 * Server actions are public HTTP endpoints: typed params are only a
 * compile-time promise, so every mutating action must re-validate its
 * input at runtime before touching the database.
 */

/** Shared schema for bare id params (delete/hide/toggle actions). */
export const idSchema = z.string().min(1, 'id is required');

export function parseInput<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown
): { ok: true; data: z.infer<S> } | { ok: false; errorMsg: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errorMsg = result.error.issues
    .map((issue) =>
      issue.path.length
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    )
    .join('; ');

  return { ok: false, errorMsg: `Invalid input: ${errorMsg}` };
}
