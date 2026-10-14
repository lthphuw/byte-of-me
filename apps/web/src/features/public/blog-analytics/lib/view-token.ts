import { createHmac, timingSafeEqual } from 'node:crypto';

import 'server-only';

import { env } from '@/shared/config/env';

/**
 * The `viewed_<blogId>` cookie holds `<logId>.<hmac>`, not the bare log id.
 * `updateBlogReadingTime` takes the log id from the caller, so a bare id in the
 * cookie proved nothing: the caller could send the same string in both places.
 */

const SEPARATOR = '.';

function sign(logId: string, secret: string): string {
  return createHmac('sha256', secret).update(logId).digest('base64url');
}

export function signViewToken(
  logId: string,
  secret: string = env.AUTH_SECRET
): string {
  return `${logId}${SEPARATOR}${sign(logId, secret)}`;
}

/** The log id a genuine token carries, or null for anything else, old bare ids included. */
export function verifyViewToken(
  token: string | undefined,
  secret: string = env.AUTH_SECRET
): string | null {
  if (!token) return null;

  const at = token.lastIndexOf(SEPARATOR);
  if (at < 1) return null;

  const logId = token.slice(0, at);
  const given = Buffer.from(token.slice(at + 1));
  const expected = Buffer.from(sign(logId, secret));

  return given.length === expected.length && timingSafeEqual(given, expected)
    ? logId
    : null;
}
