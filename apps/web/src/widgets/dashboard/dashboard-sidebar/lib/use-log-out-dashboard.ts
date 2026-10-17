'use client';

import { useServerMutation } from '@byte-of-me/query';
import { useTranslations } from 'next-intl';

import { logOutDashboard } from '@/features/auth/lib';

/**
 * The dashboard's sign-out. A successful sign-out redirects, and the redirect
 * rejects the action, which `useServerMutation` does not report as a failure.
 * Only a refusal arrives as an envelope.
 */
export function useLogOutDashboard() {
  const t = useTranslations('dashboard.sidebar');
  const { mutate } = useServerMutation<void, null>({
    mutationFn: () => logOutDashboard(),
    errorMessage: t('actions.signOutError'),
  });

  return { signOut: () => mutate() };
}
