import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { claimNoteShares } from '@/entities/note-share';
import { pickMessages, SHARE_MESSAGE_NAMESPACES } from '@/shared/i18n/messages';
import { redirect } from '@/shared/i18n/navigation';
import { getAuthenticatedUser } from '@/shared/lib/auth';
import { PATHNAME_HEADER } from '@/shared/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * The share recipient's shell.
 *
 * The guard is `getAuthenticatedUser`, not `getAuthenticatedAdmin`: anyone
 * signed in may be holding a grant, and the site owner is emphatically not
 * the audience here. It protects the VIEW only — every action under
 * `entities/note-share/api` calls `resolveNoteAccess` itself, because a
 * server action is an addressable endpoint that never renders this layout
 * (AGENTS §5). Removing one of those calls because "the layout already
 * checks" would be a vulnerability, not a cleanup.
 */
export default async function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    // `from` is what lets sign-in return the visitor to the note the
    // invitation actually named, rather than dropping everyone on the inbox.
    // The pathname comes from the proxy because a layout is never handed the
    // URL — see `PATHNAME_HEADER`.
    const from = (await headers()).get(PATHNAME_HEADER);

    redirect({
      href: { pathname: '/invite', query: from ? { from } : undefined },
      locale: await getLocale(),
    });
  }

  // Runs HERE because this is the one funnel every shared route passes
  // through — see `claimNoteShares` for why neither the inbox nor the
  // resolver is the right home for it.
  await claimNoteShares();

  // `overflow-x-clip`, never `overflow-hidden`: the latter silently kills
  // `position: sticky` in every descendant.
  return (
    <NextIntlClientProvider
      messages={pickMessages(await getMessages(), SHARE_MESSAGE_NAMESPACES)}
    >
      {/* px-safe pb-safe: `viewport-fit=cover` extends this page into the
          landscape sensor-housing edge and under the home indicator. Top is
          left to whatever header a child under `/shared/notes/*` renders —
          this layout has none of its own. */}
      <div className="px-safe pb-safe flex min-h-screen flex-col overflow-x-clip">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
