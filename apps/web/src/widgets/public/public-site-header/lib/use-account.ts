'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { logOut } from '@/features/auth';
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
 * the common case on a public site.
 */
export function useAccount(): {
  account: Account | null;
  signOutEverywhere: () => Promise<void>;
} {
  const t = useTranslations('global.userToggle');
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const signOutEverywhere = useCallback(async () => {
    // The cache first: it holds answers that were authorised by the session
    // about to be destroyed, and a full reload is not a guarantee that
    // anything in memory is gone before the next render reads it.
    queryClient.clear();
    await Promise.all([logOut(), signOut({ redirect: false })]);
    window.location.reload();
  }, [queryClient]);

  const user = session?.user;
  if (!user) return { account: null, signOutEverywhere };

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
    signOutEverywhere,
  };
}
