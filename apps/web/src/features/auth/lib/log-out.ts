'use server';

import { revalidatePath } from 'next/cache';

import { signOut as nextAuthSignOut } from '@/shared/lib/auth';

export async function logOut() {
  await nextAuthSignOut({ redirect: false });

  revalidatePath('/');
}
