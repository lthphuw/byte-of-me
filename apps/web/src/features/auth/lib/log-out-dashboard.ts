'use server';

import { getLocale } from 'next-intl/server';

import { signOut as nextAuthSignOut } from '@/shared/lib/auth';

export async function logOutDashboard() {
  // Prefixed with the active locale: an unprefixed path is resolved by the
  // next-intl proxy to `defaultLocale`, so a `vi` admin signing out would be
  // dropped onto the English sign-in page.
  const locale = await getLocale();

  await nextAuthSignOut({ redirectTo: `/${locale}/auth/login` });
}
