'use server';

import { signOut as nextAuthSignOut } from '@/features/auth/lib/auth';

export async function logOut() {
  await nextAuthSignOut({ redirectTo: '/auth/login' });
}
