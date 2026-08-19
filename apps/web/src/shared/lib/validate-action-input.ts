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
 * What a rejected caller is told, and all they are told.
 *
 * The zod issues name schema fields (`translations.0.title`) in English
 * regardless of the visitor's locale, and every action forwards `errorMsg`
 * straight into `ApiResponse` — so joining them into `errorMsg` put the
 * schema's shape on screen for anyone who could reach the action. The detail
 * is not lost, it moved: `parseInput` logs it, and returns it as `detail` for
 * the callers that legitimately want it (an admin surface, a token-guarded
 * route handler). A caller now has to ask for it by name instead of getting
 * it by default.
 */
export const INVALID_INPUT_MESSAGE =
  'The information provided is not valid. Please check it and try again.';

export type ParseInputResult<S extends z.ZodTypeAny> =
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
 * `context` names the caller in the log line. Optional so all ~60 existing
 * call sites keep compiling unchanged; pass the action name where a
 * validation failure would otherwise be unattributable, since every action in
 * the repo shares this one log site.
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
