'use server';

import { signOut as nextAuthSignOut } from '@/shared/lib/auth';

export async function logOut() {
  await nextAuthSignOut({ redirectTo: '/auth/login' });
}
