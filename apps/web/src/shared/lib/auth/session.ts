import { logger } from '@byte-of-me/logger';

import { auth } from '@/shared/lib/auth/auth';

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

export async function getAuthenticatedAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return session?.user;
}

export async function requireAdmin() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) throw new Error('Unauthorized');
  return admin;
}
