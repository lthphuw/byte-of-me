import 'server-only';

import { env } from '@/shared/config/env';
import { normalizeEmail } from '@/shared/lib/auth/normalize-email';

/**
 * The single source of truth for "is this address the site owner's."
 *
 * Reads `env.OWNER_EMAIL ?? env.EMAIL` (never a literal — AGENTS §11.7).
 * `OWNER_EMAIL` is the dedicated authorisation identity; `EMAIL` is the
 * publicly rendered contact address, the contact-form and
 * comment-notification destination, and a profile-lookup fallback (see the
 * comment on `OWNER_EMAIL` in `@/shared/config/env.ts`). They coincide today
 * only by history, and `OWNER_EMAIL` is optional specifically so that an
 * unset deployment keeps behaving exactly as before.
 *
 * `getAuthenticatedAdmin()` (in `./session.ts`), `logInToDashboard()` (the
 * sign-in form's own gate, in
 * `@/features/auth/lib/log-in-to-dashboard.ts`) and the `signIn` callback
 * that gates the admin OAuth providers (in `./auth.ts`) all call this one
 * function. A second, independently-written comparison is exactly how the
 * checks drift and one of them stops normalising — which is how the owner
 * ends up refused at the login form despite this guard being correct.
 *
 * Comparison is case-insensitive and trimmed: providers vary in how they
 * present an address, and a case difference locking the owner out of their
 * own dashboard would be a silent, confusing failure. That rule now lives in
 * `normalizeEmail()`, one level further out, because note-share grants key on
 * an address too — this gate and the grant lookup have to agree about what
 * "the same address" means, and the only way to guarantee that is to leave
 * them one implementation to disagree over.
 *
 * It lives in its own module rather than in `./session.ts` because `./auth.ts`
 * needs it too, and `./session.ts` already imports `./auth.ts` — putting it
 * there would close an import cycle between the two modules whose
 * evaluation order `session.spec.ts` documents at length as already
 * delicate.
 */
export function isSiteOwnerEmail(email: string | null | undefined): boolean {
  const ownerEmail = normalizeEmail(env.OWNER_EMAIL ?? env.EMAIL);
  const candidate = normalizeEmail(email);

  return !!candidate && candidate === ownerEmail;
}
