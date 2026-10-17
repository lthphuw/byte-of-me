'use client';

import { useServerMutation } from '@byte-of-me/query';
import { useQueryClient } from '@tanstack/react-query';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { logOut } from '@/features/auth/lib/log-out';
import { shortenName } from '@/widgets/public/public-site-header/lib/shorten-name';

export interface Account {
  name: string;
  email: string;
  /** The signed-in user's picture, if the provider gave us one. */
  image: string | null;
  /** Two letters for the avatar when there is no picture. */
  initials: string;
  roleLabel: string;
  isAdmin: boolean;
}

/**
 * Who is signed in, and how to stop being signed in.
 *
 * A hook because the account appears in two places that look nothing alike —
 * a circular trigger on desktop, a row in the nav panel on a phone — and they
 * must not disagree about what sign out does. `null` when signed out, which is
 * the common case on a public site. `isLoading` while the session request is
 * in flight, so a caller draws a skeleton rather than nothing.
 */
export function useAccount(): {
  account: Account | null;
  isLoading: boolean;
  signOutEverywhere: () => void;
} {
  const t = useTranslations('global.userToggle');
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const isLoading = status === 'loading';

  const logOutMutation = useServerMutation<void, null>({
    mutationFn: async () => {
      // The client session is cleared only after the server confirms the
      // sign-out, so a refusal leaves both sides signed in.
      const res = await logOut();
      if (res.success) await signOut({ redirect: false });
      return res;
    },
    errorMessage: t('signOutFailed'),
    onSuccess: () => {
      // Cleared only once the sign-out is confirmed: a refused one leaves the
      // session, and the answers it authorised, in place. Then a full reload.
      queryClient.clear();
      window.location.reload();
    },
  });
  const signOutEverywhere = () => logOutMutation.mutate();

  const user = session?.user;
  if (!user) return { account: null, isLoading, signOutEverywhere };

  const isAdmin = user.role?.toLocaleUpperCase() === 'ADMIN';

  // From the name, not the email — "lthphuw@…" gave "LT", two letters in no
  // version of the person's name. `shortenName` knows the last-first ordering
  // Vietnamese names use. Email stays the fallback for a nameless account.
  const initials =
    shortenName(user.name, { variant: 'initials' }) ||
    user.email?.slice(0, 2).toLocaleUpperCase() ||
    'U';

  return {
    account: {
      name: user.name
        ? shortenName(user.name, { variant: 'compact' })
        : t(isAdmin ? 'admin' : 'viewer'),
      email: user.email ?? '',
      image: user.image ?? null,
      initials: initials.toLocaleUpperCase(),
      roleLabel: t(isAdmin ? 'admin' : 'viewer'),
      isAdmin,
    },
    isLoading,
    signOutEverywhere,
  };
}
