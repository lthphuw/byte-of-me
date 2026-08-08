import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { pickMessages, SHARE_MESSAGE_NAMESPACES } from '@/shared/i18n/messages';
import { redirect } from '@/shared/i18n/navigation';
import { getAuthenticatedUser } from '@/shared/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * The share recipient's sign-in shell.
 *
 * A route group of its own, NOT `(auth)`. That layout belongs to the owner's
 * gate: it calls `getAuthenticatedAdmin()` and bounces an authenticated owner
 * to `/dashboard`, and the page beneath it renders the `-admin` OAuth twins
 * that `auth.ts`'s `signIn` callback refuses to anyone else. Sharing one
 * layout between the two audiences would mean one guard trying to be right
 * about both.
 */
export default async function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Anyone already signed in has no business on a sign-in form. The owner is
  // included: they reach their own notes through `/space`, and `/shared` will
  // simply show them an empty inbox.
  const user = await getAuthenticatedUser();

  if (user) {
    redirect({ href: '/shared', locale: await getLocale() });
  }

  // `min-h-screen`, not `h-screen` + `overflow-hidden`: the latter clips the
  // form with no way to scroll to it on short viewports, which is the trap
  // `(auth)/layout.tsx` records. `overflow-x-clip` rather than
  // `overflow-hidden` so `position: sticky` still works in anything below.
  return (
    <NextIntlClientProvider
      messages={pickMessages(await getMessages(), SHARE_MESSAGE_NAMESPACES)}
    >
      <div className="flex min-h-screen flex-col overflow-x-clip">
        <main className="container flex flex-1 flex-col">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
