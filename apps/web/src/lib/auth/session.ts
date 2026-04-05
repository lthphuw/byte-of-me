import { auth } from '@/lib/auth/auth';

export async function getAuthenticatedUser() {
  const session = await auth();
  return session?.user;
}

export async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
