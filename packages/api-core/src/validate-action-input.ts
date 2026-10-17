import { logger } from '@byte-of-me/logger';
import { z } from 'zod';

/**
 * Server actions are public HTTP endpoints: typed params are only a
 * compile-time promise, so every mutating action must re-validate its
 * input at runtime before touching the database.
 */

/** Shared schema for bare id params (delete/hide/toggle actions). */
export const idSchema = z.string().min(1, 'id is required');

/**
 * All a rejected caller is told: zod issues name schema fields in English and
 * actions forward `errorMsg`, so they leaked the schema's shape. `parseInput`
 * logs the detail and returns it as `detail` for admin surfaces and routes.
 */
export const INVALID_INPUT_MESSAGE =
  'The information provided is not valid. Please check it and try again.';

type ParseInputResult<S extends z.ZodTypeAny> =
  | { ok: true; data: z.infer<S> }
  | {
      ok: false;
      /** Safe to render anywhere. Says nothing about the schema. */
      errorMsg: string;
      /**
       * One code, because that is all this function can distinguish — the
       * same `'invalid'` the contact form already translates.
       */
      errorCode: 'invalid';
      /** The field-level reason. For logs and admin surfaces, never a visitor. */
      detail: string;
    };

/**
 * `context` names the caller in the log line (optional, so ~60 call sites
 * compile unchanged); pass the action name, as every action shares this one
 * log site.
 */
export function parseInput<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  context = 'parseInput'
): ParseInputResult<S> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const detail = result.error.issues
    .map((issue) =>
      issue.path.length
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    )
    .join('; ');

  // `warn`, not `error`: a rejected input is the guard working, not the server
  // failing, and these arrive at whatever rate a bot posts at. It still has to
  // be logged — losing the field paths would trade a UI leak for a blind spot.
  logger.warn(`[${context}] Invalid input: ${detail}`);

  return {
    ok: false,
    errorMsg: INVALID_INPUT_MESSAGE,
    errorCode: 'invalid',
    detail,
  };
}
