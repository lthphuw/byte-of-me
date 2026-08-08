import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import {
  pickMessages,
  PROTECTED_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';
import { redirect } from '@/shared/i18n/navigation';
import {
  getAuthenticatedAdmin,
  getAuthenticatedUser,
} from '@/shared/lib/auth';
import { PATHNAME_HEADER } from '@/shared/lib/constants';





export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedAdmin();

  if (!user) {
    // Signed in, but not the site owner — a share recipient who followed a
    // `/space` link, or typed one. Sending them to the owner's sign-in form
    // is a dead end: they are already authenticated, so the form has nothing
    // to offer them, and its providers are the `-admin` twins that refuse
    // anyone but the owner. `/shared` is the surface they actually have.
    const anyUser = await getAuthenticatedUser();

    if (anyUser) {
      redirect({ href: '/shared', locale: await getLocale() });
    }

    // `from` is what lets sign-in return the visitor to the page they actually
    // asked for. Without it every rejected visitor lands on the dashboard, which
    // is wrong for `/notes` — the other route this layout guards. The pathname
    // comes from the proxy because a layout is never handed the URL; see
    // `PATHNAME_HEADER`.
    const from = (await headers()).get(PATHNAME_HEADER);

    redirect({
      href: {
        pathname: '/auth/login',
        query: from ? { from } : undefined,
      },
      locale: await getLocale(),
    });
  }

  return (
    <NextIntlClientProvider
      messages={pickMessages(await getMessages(), PROTECTED_MESSAGE_NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
