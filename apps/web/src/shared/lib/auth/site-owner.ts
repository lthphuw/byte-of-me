import { normalizeEmail } from '@byte-of-me/api-core';

import 'server-only';

import { env } from '@/shared/config/env';

/**
 * The one "is this the site owner" check, shared by session.ts, the login form and the signIn
 * callback so they cannot drift. Reads `env.OWNER_EMAIL ?? env.EMAIL`, case-insensitive and trimmed.
 * Own module: session.ts imports auth.ts, which needs this, so living there would be an import cycle.
 */
export function isSiteOwnerEmail(email: string | null | undefined): boolean {
  const ownerEmail = normalizeEmail(env.OWNER_EMAIL ?? env.EMAIL);
  const candidate = normalizeEmail(email);

  return !!candidate && candidate === ownerEmail;
}
