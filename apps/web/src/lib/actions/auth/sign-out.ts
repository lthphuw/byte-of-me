'use server';

import { signOut as nextAuthSignOut } from '@/lib/auth/auth';

export async function signOut() {
  await nextAuthSignOut({ redirectTo: '/auth/login' });
}
