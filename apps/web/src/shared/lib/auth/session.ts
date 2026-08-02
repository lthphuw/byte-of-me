import { logger } from '@byte-of-me/logger';

import 'server-only';

import { auth } from '@/shared/lib/auth/auth';
import { isSiteOwnerEmail } from '@/shared/lib/auth/site-owner';

// Re-exported from here because this is where it used to live, and both the
// test preload's `stub-auth` plugin and `session.spec.ts` read it off this
// module by path rather than through the barrel.
export { isSiteOwnerEmail };

export async function getAuthenticatedUser() {
  const session = await auth();
  logger.debug(`Session for user: ${JSON.stringify(session, null, 2)}`);

  if (!session?.user?.role || !['USER', 'ADMIN'].includes(session.user.role)) {
    return null;
  }

  return session?.user;
}

export async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

/**
 * The one human this site belongs to.
 *
 * This is deliberately an *identity* check, not just a role check. `role` is a
 * column any future `User` row could carry, and a second ADMIN would otherwise
 * inherit the dashboard, the private notes, and every admin server action.
 * Identity is delegated to `isSiteOwnerEmail()` above so this guard and the
 * sign-in form's gate can never disagree.
 *
 * It is narrowed here rather than in `(protected)/layout.tsx` on purpose. The
 * layout guard only protects the *view*; server actions are addressable
 * endpoints that never render it (AGENTS §5). Every `requireAdmin()` call site
 * funnels through this function, so narrowing it covers the actions too.
 */
export async function getAuthenticatedAdmin() {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  if (!isSiteOwnerEmail(session.user.email)) {
    // Logged because the alternative is an owner staring at a login redirect
    // with no way to tell a misconfigured OWNER_EMAIL/EMAIL from a real
    // rejection.
    logger.warn(
      `Admin access denied: role ADMIN but identity is not the site owner`
    );
    return null;
  }

  return session.user;
}

export async function requireAdmin() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) throw new Error('Unauthorized');
  return admin;
}
