'use server';

import { signOut as nextAuthSignOut } from '@/shared/lib/auth';

export async function logOutDashboard() {
  await nextAuthSignOut({ redirectTo: '/auth/login' });
}
